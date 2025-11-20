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
// ============================================================
// РАСЧЁТ ПОЗИЦИЙ НЕБЕСНЫХ ТЕЛ
// ============================================================

function calculateSunPosition(dayOfYear, hourOfDay) {
    // Угол годового цикла
    const yearAngle = ((dayOfYear - 355) * 360 / 365) * Math.PI / 180;

    // Радиус орбиты Солнца
    const minRadius = 5000;
    const maxRadius = 14000;
    const sunRadius = minRadius + (maxRadius - minRadius) * (1 - Math.cos(yearAngle)) / 2;

    // Угол суточного вращения
    const dailyAngle = (hourOfDay * 360 / 24) * Math.PI / 180;

    // Координаты
    const x = sunRadius * Math.cos(dailyAngle);
    const y = sunRadius * Math.sin(dailyAngle);
    const z = DOME_HEIGHT;

    return { x, y, z, radius: sunRadius };
}

function calculateMoonPosition(dayOfYear, hourOfDay, moonPhaseDay) {
    // Радиус орбиты Луны
    const moonRadiusMin = 8000;
    const moonRadiusMax = 12000;
    const moonRadius = (moonRadiusMin + moonRadiusMax) / 2 +
                      (moonRadiusMax - moonRadiusMin) * Math.sin((moonPhaseDay * 360 / 29.5) * Math.PI / 180) / 2;

    // Угол месячного цикла
    const monthlyAngle = (moonPhaseDay * 360 / 29.5) * Math.PI / 180;

    // Угол суточного вращения
    const dailyOffset = ((hourOfDay * 360 / 24) + (monthlyAngle * 180 / Math.PI)) * Math.PI / 180;

    // Координаты
    const x = moonRadius * Math.cos(dailyOffset);
    const y = moonRadius * Math.sin(dailyOffset);
    const z = DOME_HEIGHT;

    return { x, y, z, radius: moonRadius };
}

function calculateShadowPosition(sunPos) {
    // Направление тени от Солнца через магнитную скалу
    const shadowDirX = -sunPos.x;
    const shadowDirY = -sunPos.y;
    const shadowDirZ = -sunPos.z + MAGNETIC_ROCK_HEIGHT;

    const length = Math.sqrt(shadowDirX ** 2 + shadowDirY ** 2 + shadowDirZ ** 2);
    const unitX = shadowDirX / length;
    const unitY = shadowDirY / length;
    const unitZ = shadowDirZ / length;

    // Пересечение с куполом
    const t = (DOME_HEIGHT - MAGNETIC_ROCK_HEIGHT) / unitZ;
    const x = unitX * t;
    const y = unitY * t;
    const z = DOME_HEIGHT;

    return { x, y, z };
}

// ============================================================
// ОБНОВЛЕНИЕ НЕБЕСНЫХ ТЕЛ
// ============================================================

function updateCelestialBodies() {
    // Вычисляем позиции
    const sunPos = calculateSunPosition(dayOfYear, hourOfDay);
    const moonPos = calculateMoonPosition(dayOfYear, hourOfDay, moonPhaseDay);
    const shadowPos = calculateShadowPosition(sunPos);

    // Удаляем старые объекты если есть
    if (sunMesh) scene.remove(sunMesh);
    if (moonMesh) scene.remove(moonMesh);
    if (shadowMesh) scene.remove(shadowMesh);

    // Создаём Солнце
    const sunGeometry = new THREE.SphereGeometry((SUN_DIAMETER / 2) * SCALE_FACTOR, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffeb3b,
        emissive: 0xffc107,
        emissiveIntensity: 1
    });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(
        sunPos.x * SCALE_FACTOR,
        sunPos.z * SCALE_FACTOR,
        sunPos.y * SCALE_FACTOR
    );

    // Добавляем свечение Солнца
    const sunLight = new THREE.PointLight(0xffeb3b, 2, 300);
    sunMesh.add(sunLight);

    scene.add(sunMesh);

    // Создаём Луну
    const moonGeometry = new THREE.SphereGeometry((MOON_DIAMETER / 2) * SCALE_FACTOR, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.9,
        metalness: 0.1
    });
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.set(
        moonPos.x * SCALE_FACTOR,
        moonPos.z * SCALE_FACTOR,
        moonPos.y * SCALE_FACTOR
    );
    scene.add(moonMesh);

    // Создаём тень (умбра)
    const shadowGeometry = new THREE.RingGeometry(
        (144 / 2) * SCALE_FACTOR * 0.9,
        (144 / 2) * SCALE_FACTOR * 1.1,
        32
    );
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.set(
        shadowPos.x * SCALE_FACTOR,
        shadowPos.z * SCALE_FACTOR,
        shadowPos.y * SCALE_FACTOR
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    // Обновляем информационную панель
    updateInfoPanel(sunPos, moonPos, shadowPos);
}

// ============================================================
// ОБНОВЛЕНИЕ ИНФОРМАЦИОННОЙ ПАНЕЛИ
// ============================================================

function updateInfoPanel(sunPos, moonPos, shadowPos) {
    document.getElementById('sun-x').textContent = Math.round(sunPos.x).toLocaleString();
    document.getElementById('sun-y').textContent = Math.round(sunPos.y).toLocaleString();
    document.getElementById('moon-x').textContent = Math.round(moonPos.x).toLocaleString();
    document.getElementById('moon-y').textContent = Math.round(moonPos.y).toLocaleString();

    // Вычисляем угловую разность
    const sunAngle = Math.atan2(sunPos.y, sunPos.x) * 180 / Math.PI;
    const moonAngle = Math.atan2(moonPos.y, moonPos.x) * 180 / Math.PI;
    let angleDiff = moonAngle - sunAngle;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    document.getElementById('angle-diff').textContent = Math.round(angleDiff);

    // Проверка затмения
    const eclipseStatus = document.getElementById('eclipse-status');
    const distanceMoonShadow = Math.sqrt(
        (moonPos.x - shadowPos.x) ** 2 + (moonPos.y - shadowPos.y) ** 2
    );
    const umbraRadius = 144 / 2;

    if (Math.abs(angleDiff) > 170 && Math.abs(angleDiff) < 190) {
        if (distanceMoonShadow < umbraRadius) {
            eclipseStatus.innerHTML = '<div class="eclipse-warning">⚠️ ПОЛНОЕ ЛУННОЕ ЗАТМЕНИЕ!</div>';
        } else if (distanceMoonShadow < umbraRadius * 1.5) {
            eclipseStatus.innerHTML = '<div class="eclipse-warning" style="background: #fff3e0; color: #e65100;">⚠️ Частичное затмение</div>';
        } else {
            eclipseStatus.innerHTML = '<div class="eclipse-warning" style="background: #e3f2fd; color: #1565c0;">ℹ️ Оппозиция (возможно затмение)</div>';
        }
    } else {
        eclipseStatus.innerHTML = '';
    }
}

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

function setupEventListeners() {
    // Слайдеры
    document.getElementById('day-slider').addEventListener('input', (e) => {
        dayOfYear = parseInt(e.target.value);
        document.getElementById('day-value').textContent = dayOfYear;
        updateCelestialBodies();
    });

    document.getElementById('hour-slider').addEventListener('input', (e) => {
        hourOfDay = parseInt(e.target.value);
        document.getElementById('hour-value').textContent = hourOfDay;
        updateCelestialBodies();
    });

    document.getElementById('moon-day-slider').addEventListener('input', (e) => {
        moonPhaseDay = parseInt(e.target.value);
        document.getElementById('moon-day-value').textContent = moonPhaseDay;
        updateCelestialBodies();
    });

    // Чекбоксы видимости
    document.getElementById('show-earth').addEventListener('change', (e) => {
        earthMesh.visible = e.target.checked;
    });

    document.getElementById('show-atmosphere').addEventListener('change', (e) => {
        atmosphereMesh.visible = e.target.checked;
    });

    document.getElementById('show-dome').addEventListener('change', (e) => {
        domeMesh.visible = e.target.checked;
    });

    document.getElementById('show-sun').addEventListener('change', (e) => {
        if (sunMesh) sunMesh.visible = e.target.checked;
    });

    document.getElementById('show-moon').addEventListener('change', (e) => {
        if (moonMesh) moonMesh.visible = e.target.checked;
    });

    document.getElementById('show-shadow').addEventListener('change', (e) => {
        if (shadowMesh) shadowMesh.visible = e.target.checked;
    });

    document.getElementById('show-grid').addEventListener('change', (e) => {
        gridHelper.visible = e.target.checked;
    });

    // Кнопка сброса камеры
    document.getElementById('reset-camera').addEventListener('click', () => {
        camera.position.set(300, 200, 300);
        camera.lookAt(0, 0, 0);
        controls.reset();
    });

    // Кнопка анимации
    document.getElementById('animate-toggle').addEventListener('click', (e) => {
        isAnimating = !isAnimating;
        e.target.textContent = isAnimating ? '⏸️ Пауза' : '▶️ Анимация';
    });

    // Ресайз окна
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
// ============================================================
// ЦИКЛ АНИМАЦИИ
// ============================================================

function animate() {
    animationId = requestAnimationFrame(animate);

    // Автоматическое вращение времени если включена анимация
    if (isAnimating) {
        hourOfDay += 0.1;
        if (hourOfDay >= 24) {
            hourOfDay = 0;
            dayOfYear++;
            if (dayOfYear > 365) dayOfYear = 1;
            document.getElementById('day-slider').value = dayOfYear;
            document.getElementById('day-value').textContent = dayOfYear;
        }
        document.getElementById('hour-slider').value = Math.floor(hourOfDay);
        document.getElementById('hour-value').textContent = Math.floor(hourOfDay);

        updateCelestialBodies();
    }

    // Вращение купола (медленное)
    if (domeMesh) {
        domeMesh.rotation.y += 0.0005;
    }

    controls.update();
    renderer.render(scene, camera);
}

// ============================================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================

// Ждём загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
