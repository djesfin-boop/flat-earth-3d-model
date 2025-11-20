// ============================================================
// 3D МОДЕЛЬ ПЛОСКОЙ ЗЕМЛИ С КУПОЛОМ
// Three.js Implementation
// ============================================================

// Константы модели (в километрах)
const EARTH_RADIUS = 20000;
const DOME_HEIGHT = 4000;
const MAGNETIC_ROCK_HEIGHT = 60;
const MAGNETIC_ROCK_DIAMETER = 180;
const ATMOSPHERE_HEIGHT = 50;
const SUN_DIAMETER = 37;
const MOON_DIAMETER = 36;
const SCALE_FACTOR = 0.01; // Масштаб для отображения (иначе числа слишком большие)

// Глобальные переменные
let scene, camera, renderer, controls;
let earthMesh, atmosphereMesh, domeMesh, rockMesh, sunMesh, moonMesh, shadowMesh;
let gridHelper;
let dayOfYear = 172;
let hourOfDay = 12;
let moonPhaseDay = 15;
let isAnimating = false;
let animationId;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

function init() {
    // Создаём сцену
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 50, 400);

    // Создаём камеру
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(300, 200, 300);
    camera.lookAt(0, 0, 0);

    // Создаём рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Добавляем OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 800;
    controls.maxPolarAngle = Math.PI / 2;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Создаём объекты
    createEarth();
    createMagneticRock();
    createAtmosphere();
    createDome();
    createGrid();

    // Создаём светила (будут обновляться)
    updateCelestialBodies();

    // События
    setupEventListeners();

    // Скрываем экран загрузки
    document.getElementById('loading').style.display = 'none';

    // Запускаем анимацию
    animate();
}

// ============================================================
// СОЗДАНИЕ ОБЪЕКТОВ
// ============================================================

function createEarth() {
    // Плоский диск Земли
    const earthGeometry = new THREE.CircleGeometry(EARTH_RADIUS * SCALE_FACTOR, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
        color: 0x1565c0,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.x = -Math.PI / 2;
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);

    // Край Земли (ледяная стена)
    const edgeGeometry = new THREE.TorusGeometry(
        EARTH_RADIUS * SCALE_FACTOR,
        5,
        16,
        64
    );
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.1
    });
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeMesh.rotation.x = Math.PI / 2;
    earthMesh.add(edgeMesh);
}

function createMagneticRock() {
    // Конус магнитной скалы
    const rockGeometry = new THREE.ConeGeometry(
        (MAGNETIC_ROCK_DIAMETER / 2) * SCALE_FACTOR,
        MAGNETIC_ROCK_HEIGHT * SCALE_FACTOR,
        32
    );
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
    rockMesh.position.set(0, (MAGNETIC_ROCK_HEIGHT / 2) * SCALE_FACTOR, 0);
    rockMesh.castShadow = true;
    scene.add(rockMesh);
}

function createAtmosphere() {
    // Слой атмосферы (прозрачный диск)
    const atmGeometry = new THREE.CircleGeometry(EARTH_RADIUS * SCALE_FACTOR, 64);
    const atmMaterial = new THREE.MeshStandardMaterial({
        color: 0x00bcd4,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    atmosphereMesh = new THREE.Mesh(atmGeometry, atmMaterial);
    atmosphereMesh.rotation.x = -Math.PI / 2;
    atmosphereMesh.position.y = ATMOSPHERE_HEIGHT * SCALE_FACTOR;
    scene.add(atmosphereMesh);

    // Край атмосферы
    const atmEdgeGeometry = new THREE.TorusGeometry(
        EARTH_RADIUS * SCALE_FACTOR,
        0.5,
        8,
        64
    );
    const atmEdgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00bcd4,
        transparent: true,
        opacity: 0.5
    });
    const atmEdgeMesh = new THREE.Mesh(atmEdgeGeometry, atmEdgeMaterial);
    atmEdgeMesh.rotation.x = Math.PI / 2;
    atmosphereMesh.add(atmEdgeMesh);
}

function createDome() {
    // Полусфера купола
    const domeGeometry = new THREE.SphereGeometry(
        EARTH_RADIUS * SCALE_FACTOR,
        64,
        32,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
    );
    const domeMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.8
    });
    domeMesh = new THREE.Mesh(domeGeometry, domeMaterial);
    domeMesh.scale.y = DOME_HEIGHT / EARTH_RADIUS;
    scene.add(domeMesh);
}

function createGrid() {
    // Координатная сетка
    gridHelper = new THREE.Group();

    // Радиальные линии
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(
            Math.cos(angle) * EARTH_RADIUS * SCALE_FACTOR,
            0,
            Math.sin(angle) * EARTH_RADIUS * SCALE_FACTOR
        ));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        });
        const line = new THREE.Line(geometry, material);
        gridHelper.add(line);
    }

    // Круги
    for (let r of [5000, 10000, 15000, 20000]) {
        const circleGeometry = new THREE.CircleGeometry(r * SCALE_FACTOR, 64);
        const edges = new THREE.EdgesGeometry(circleGeometry);
        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        });
        const circle = new THREE.LineSegments(edges, material);
        circle.rotation.x = -Math.PI / 2;
        gridHelper.add(circle);
    }

    scene.add(gridHelper);
}