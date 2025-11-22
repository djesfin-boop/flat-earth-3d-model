// ============================================================
// 3D МОДЕЛЬ ПЛОСКОЙ ЗЕМЛИ С КУПОЛОМ И ЦЕНТРАЛЬНОЙ ПРОЕКЦИЕЙ
// Исправленная версия с правильной физикой
// ============================================================

// Константы модели (в километрах)
const EARTH_RADIUS = 20000;           // Радиус плоского диска Земли
const DOME_RADIUS = 20000;             // Радиус купола (полусфера)
const DOME_MAX_HEIGHT = 20000;         // Максимальная высота купола
const MAGNETIC_ROCK_HEIGHT = 60;       // Высота магнитной скалы
const MAGNETIC_ROCK_DIAMETER = 180;    // Диаметр магнитной скалы
const ATMOSPHERE_HEIGHT = 50;          // Высота слоя атмосферы
const SUN_DIAMETER = 37;               // Диаметр Солнца
const MOON_DIAMETER = 36;              // Диаметр Луны

// Орбитальные параметры светил (высоты ПОД куполом)
const SUN_ORBIT_HEIGHT = 3500;         // Высота орбиты Солнца
const MOON_ORBIT_HEIGHT = 3000;        // Высота орбиты Луны
const SUN_ORBIT_MIN_RADIUS = 5000;     // Минимальный радиус орбиты Солнца
const SUN_ORBIT_MAX_RADIUS = 14000;    // Максимальный радиус орбиты Солнца
const MOON_ORBIT_MIN_RADIUS = 8000;    // Минимальный радиус орбиты Луны
const MOON_ORBIT_MAX_RADIUS = 12000;   // Максимальный радиус орбиты Луны

// Параметры световых пятен
const LIGHT_SPOT_SIZE = 800;           // Размер светового пятна на атмосфере
const PROJECTION_INTENSITY = 2.0;      // Интенсивность проекции

const SCALE_FACTOR = 0.01;             // Масштаб для отображения

// Глобальные переменные
let scene, camera, renderer, controls;
let earthMesh, atmosphereMesh, domeMesh, rockMesh;
let sunMesh, moonMesh, sunSpotMesh, moonSpotMesh;
let centralLightSource, sunProjectionRay, moonProjectionRay;
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
    scene.fog = new THREE.Fog(0x0a0a15, 50, 500);

    // Создаём камеру
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1200
    );
    camera.position.set(400, 250, 400);
    camera.lookAt(0, 0, 0);

    // Создаём рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Добавляем OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;

    // Базовое освещение
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    scene.add(ambientLight);

    // Создаём объекты
    createEarth();
    createMagneticRock();
    createAtmosphere();
    createDome();
    createGrid();
    createCentralLightSource();

    // Создаём светила и проекции
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
        metalness: 0.1,
        emissive: 0xaaccff,
        emissiveIntensity: 0.2
    });
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeMesh.rotation.x = Math.PI / 2;
    earthMesh.add(edgeMesh);
}

function createMagneticRock() {
    // Конус магнитной скалы в центре
    const rockGeometry = new THREE.ConeGeometry(
        (MAGNETIC_ROCK_DIAMETER / 2) * SCALE_FACTOR,
        MAGNETIC_ROCK_HEIGHT * SCALE_FACTOR,
        32
    );
    const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.3,
        emissive: 0x330033,
        emissiveIntensity: 0.1
    });
    rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
    rockMesh.position.set(0, (MAGNETIC_ROCK_HEIGHT / 2) * SCALE_FACTOR, 0);
    rockMesh.castShadow = true;
    scene.add(rockMesh);
}

function createAtmosphere() {
    // Слой атмосферы (прозрачный диск для проекций)
    const atmGeometry = new THREE.CircleGeometry(EARTH_RADIUS * SCALE_FACTOR, 64);
    const atmMaterial = new THREE.MeshStandardMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
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
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.4
    });
    const atmEdgeMesh = new THREE.Mesh(atmEdgeGeometry, atmEdgeMaterial);
    atmEdgeMesh.rotation.x = Math.PI / 2;
    atmosphereMesh.add(atmEdgeMesh);
}

function createDome() {
    // ПРАВИЛЬНАЯ полусфера купола радиусом 20000 км
    const domeGeometry = new THREE.SphereGeometry(
        DOME_RADIUS * SCALE_FACTOR,
        64,
        32,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
    );
    const domeMaterial = new THREE.MeshStandardMaterial({
        color: 0x88aacc,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.7,
        depthWrite: false
    });
    domeMesh = new THREE.Mesh(domeGeometry, domeMaterial);
    // НЕ масштабируем по Y - оставляем правильную полусферу
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

function createCentralLightSource() {
    // Центральный источник света в точке (0,0,0)
    const lightGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        emissive: 0xffffaa,
        emissiveIntensity: 2
    });
    centralLightSource = new THREE.Mesh(lightGeometry, lightMaterial);
    centralLightSource.position.set(0, 0, 0);
    scene.add(centralLightSource);

    // Добавляем точечный свет от центрального источника
    const pointLight = new THREE.PointLight(0xffffcc, 1.5, 500);
    centralLightSource.add(pointLight);
}

// ============================================================
// РАСЧЁТ ПОЗИЦИЙ НЕБЕСНЫХ ТЕЛ И ПРОЕКЦИЙ
// ============================================================

function calculateSunPosition(dayOfYear, hourOfDay) {
    // Угол годового цикла
    const yearAngle = ((dayOfYear - 355) * 360 / 365) * Math.PI / 180;
    
    // Радиус орбиты Солнца (изменяется в течение года)
    const sunRadius = SUN_ORBIT_MIN_RADIUS + 
                     (SUN_ORBIT_MAX_RADIUS - SUN_ORBIT_MIN_RADIUS) * 
                     (1 - Math.cos(yearAngle)) / 2;
    
    // Угол суточного вращения
    const dailyAngle = (hourOfDay * 360 / 24) * Math.PI / 180;
    
    // Координаты (ПОД куполом!)
    const x = sunRadius * Math.cos(dailyAngle);
    const y = sunRadius * Math.sin(dailyAngle);
    const z = SUN_ORBIT_HEIGHT;  // На высоте 3500 км
    
    return { x, y, z, radius: sunRadius };
}

function calculateMoonPosition(dayOfYear, hourOfDay, moonPhaseDay) {
    // Радиус орбиты Луны
    const moonRadius = MOON_ORBIT_MIN_RADIUS + 
                      (MOON_ORBIT_MAX_RADIUS - MOON_ORBIT_MIN_RADIUS) * 
                      (1 + Math.sin((moonPhaseDay * 360 / 29.5) * Math.PI / 180)) / 2;
    
    // Угол месячного цикла
    const monthlyAngle = (moonPhaseDay * 360 / 29.5) * Math.PI / 180;
    
    // Угол суточного вращения со сдвигом
    const dailyOffset = ((hourOfDay * 360 / 24) + (monthlyAngle * 180 / Math.PI)) * Math.PI / 180;
    
    // Координаты (ПОД куполом!)
    const x = moonRadius * Math.cos(dailyOffset);
    const y = moonRadius * Math.sin(dailyOffset);
    const z = MOON_ORBIT_HEIGHT;  // На высоте 3000 км
    
    return { x, y, z, radius: moonRadius };
}

// Расчёт проекции на купол: луч от центра (0,0,0) через светило
function calculateDomeProjection(celestialPos) {
    // Направление луча от центра к светилу
    const dirX = celestialPos.x;
    const dirY = celestialPos.y;
    const dirZ = celestialPos.z;
    
    // Нормализуем направление
    const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const unitX = dirX / length;
    const unitY = dirY / length;
    const unitZ = dirZ / length;
    
    // Пересечение луча с куполом (полусфера радиуса DOME_RADIUS)
    // Решаем: (t*unitX)^2 + (t*unitY)^2 + (t*unitZ)^2 = DOME_RADIUS^2
    // t^2 = DOME_RADIUS^2 (т.к. единичный вектор)
    const t = DOME_RADIUS;
    
    const projX = unitX * t;
    const projY = unitY * t;
    const projZ = Math.max(0, unitZ * t);  // Только верхняя полусфера
    
    return { x: projX, y: projY, z: projZ };
}

// Расчёт отражения на атмосферу: проекция с купола вниз на слой 50 км
function calculateAtmosphereSpot(domeProjection) {
    // Отраженный луч идёт вниз на атмосферу
    // Упрощённый расчёт: проекция по вертикали
    const spotX = domeProjection.x;
    const spotY = domeProjection.y;
    const spotZ = ATMOSPHERE_HEIGHT;  // На уровне атмосферы
    
    return { x: spotX, y: spotY, z: spotZ };
}

// ============================================================
// ОБНОВЛЕНИЕ НЕБЕСНЫХ ТЕЛ И ПРОЕКЦИЙ
// ============================================================

function updateCelestialBodies() {
    // Вычисляем позиции светил
    const sunPos = calculateSunPosition(dayOfYear, hourOfDay);
    const moonPos = calculateMoonPosition(dayOfYear, hourOfDay, moonPhaseDay);
    
    // Вычисляем проекции на купол
    const sunDomeProj = calculateDomeProjection(sunPos);
    const moonDomeProj = calculateDomeProjection(moonPos);
    
    // Вычисляем световые пятна на атмосфере
    const sunAtmSpot = calculateAtmosphereSpot(sunDomeProj);
    const moonAtmSpot = calculateAtmosphereSpot(moonDomeProj);
    
    // Удаляем старые объекты
    if (sunMesh) scene.remove(sunMesh);
    if (moonMesh) scene.remove(moonMesh);
    if (sunSpotMesh) scene.remove(sunSpotMesh);
    if (moonSpotMesh) scene.remove(moonSpotMesh);
    if (sunProjectionRay) scene.remove(sunProjectionRay);
    if (moonProjectionRay) scene.remove(moonProjectionRay);
    
    // ===== СОЛНЦЕ =====
    const sunGeometry = new THREE.SphereGeometry((SUN_DIAMETER / 2) * SCALE_FACTOR, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffeb3b,
        emissive: 0xffc107,
        emissiveIntensity: 1.5
    });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(
        sunPos.x * SCALE_FACTOR,
        sunPos.z * SCALE_FACTOR,
        sunPos.y * SCALE_FACTOR
    );
    
    // Свечение Солнца
    const sunLight = new THREE.PointLight(0xffeb3b, 1.5, 400);
    sunMesh.add(sunLight);
    scene.add(sunMesh);
    
    // Луч проекции от центра к Солнцу
    const sunRayPoints = [];
    sunRayPoints.push(new THREE.Vector3(0, 0, 0));
    sunRayPoints.push(new THREE.Vector3(
        sunPos.x * SCALE_FACTOR,
        sunPos.z * SCALE_FACTOR,
        sunPos.y * SCALE_FACTOR
    ));
    const sunRayGeometry = new THREE.BufferGeometry().setFromPoints(sunRayPoints);
    const sunRayMaterial = new THREE.LineBasicMaterial({
        color: 0xffeb3b,
        transparent: true,
        opacity: 0.4,
        linewidth: 2
    });
    sunProjectionRay = new THREE.Line(sunRayGeometry, sunRayMaterial);
    scene.add(sunProjectionRay);
    
    // Световое пятно Солнца на атмосфере
    const sunSpotGeometry = new THREE.CircleGeometry(LIGHT_SPOT_SIZE * SCALE_FACTOR, 32);
    const sunSpotMaterial = new THREE.MeshBasicMaterial({
        color: 0xffeb3b,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    sunSpotMesh = new THREE.Mesh(sunSpotGeometry, sunSpotMaterial);
    sunSpotMesh.position.set(
        sunAtmSpot.x * SCALE_FACTOR,
        sunAtmSpot.z * SCALE_FACTOR,
        sunAtmSpot.y * SCALE_FACTOR
    );
    sunSpotMesh.rotation.x = -Math.PI / 2;
    
    // Добавляем свечение от пятна
    const sunSpotLight = new THREE.PointLight(0xffeb3b, PROJECTION_INTENSITY, 300);
    sunSpotMesh.add(sunSpotLight);
    scene.add(sunSpotMesh);
    
    // ===== ЛУНА =====
    const moonGeometry = new THREE.SphereGeometry((MOON_DIAMETER / 2) * SCALE_FACTOR, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.9,
        metalness: 0.1,
        emissive: 0x444444,
        emissiveIntensity: 0.3
    });
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.set(
        moonPos.x * SCALE_FACTOR,
        moonPos.z * SCALE_FACTOR,
        moonPos.y * SCALE_FACTOR
    );
    scene.add(moonMesh);
    
    // Луч проекции от центра к Луне
    const moonRayPoints = [];
    moonRayPoints.push(new THREE.Vector3(0, 0, 0));
    moonRayPoints.push(new THREE.Vector3(
        moonPos.x * SCALE_FACTOR,
        moonPos.z * SCALE_FACTOR,
        moonPos.y * SCALE_FACTOR
    ));
    const moonRayGeometry = new THREE.BufferGeometry().setFromPoints(moonRayPoints);
    const moonRayMaterial = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.3,
        linewidth: 2
    });
    moonProjectionRay = new THREE.Line(moonRayGeometry, moonRayMaterial);
    scene.add(moonProjectionRay);
    
    // Световое пятно Луны на атмосфере
    const moonSpotGeometry = new THREE.CircleGeometry(LIGHT_SPOT_SIZE * SCALE_FACTOR * 0.95, 32);
    const moonSpotMaterial = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    moonSpotMesh = new THREE.Mesh(moonSpotGeometry, moonSpotMaterial);
    moonSpotMesh.position.set(
        moonAtmSpot.x * SCALE_FACTOR,
        moonAtmSpot.z * SCALE_FACTOR,
        moonAtmSpot.y * SCALE_FACTOR
    );
    moonSpotMesh.rotation.x = -Math.PI / 2;
    
    // Добавляем слабое свечение от пятна Луны
    const moonSpotLight = new THREE.PointLight(0xccccff, PROJECTION_INTENSITY * 0.5, 200);
    moonSpotMesh.add(moonSpotLight);
    scene.add(moonSpotMesh);
    
    // Обновляем информационную панель
    updateInfoPanel(sunPos, moonPos, sunAtmSpot, moonAtmSpot);
}

// ============================================================
// ИНФОРМАЦИОННАЯ ПАНЕЛЬ
// ============================================================
function updateInfoPanel(sunPos, moonPos, sunAtmSpot, moonAtmSpot) {
    document.getElementById('sun-x').textContent = Math.round(sunPos.x).toLocaleString();
    document.getElementById('sun-y').textContent = Math.round(sunPos.y).toLocaleString();
    document.getElementById('moon-x').textContent = Math.round(moonPos.x).toLocaleString();
    document.getElementById('moon-y').textContent = Math.round(moonPos.y).toLocaleString();
    
    const sunAngle = Math.atan2(sunPos.y, sunPos.x) * 180 / Math.PI;
    const moonAngle = Math.atan2(moonPos.y, moonPos.x) * 180 / Math.PI;
    let angleDiff = moonAngle - sunAngle;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    document.getElementById('angle-diff').textContent = Math.round(angleDiff);
    
    const eclipseStatus = document.getElementById('eclipse-status');
    const distanceMoonSun = Math.sqrt(
        (moonAtmSpot.x - sunAtmSpot.x) ** 2 + (moonAtmSpot.y - sunAtmSpot.y) ** 2
    );
    
    if (Math.abs(angleDiff) > 170 && Math.abs(angleDiff) < 190) {
        if (distanceMoonSun < LIGHT_SPOT_SIZE * 0.5) {
            eclipseStatus.innerHTML = '<div class="eclipse-warning">⚠️ ПОЛНОЕ ЛУННОЕ ЗАТМЕНИЕ!</div>';
        } else if (distanceMoonSun < LIGHT_SPOT_SIZE) {
            eclipseStatus.innerHTML = '<div class="eclipse-warning" style="background: #fff3e0; color: #e65100;">⚠️ Частичное затмение</div>';
        } else {
            eclipseStatus.innerHTML = '<div class="eclipse-warning" style="background: #e3f2fd; color: #1565c0;">ℹ️ Оппозиция</div>';
        }
    } else {
        eclipseStatus.innerHTML = '';
    }
}

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================
function setupEventListeners() {
    document.getElementById('day-slider').addEventListener('input', (e) => {
        dayOfYear = parseInt(e.target.value);
        document.getElementById('day-value').textContent = dayOfYear;
        updateCelestialBodies();
    });
    
    document.getElementById('hour-slider').addEventListener('input', (e) => {
        hourOfDay = parseFloat(e.target.value);
        document.getElementById('hour-value').textContent = Math.floor(hourOfDay) + ':' + String(Math.floor((hourOfDay % 1) * 60)).padStart(2, '0');
        updateCelestialBodies();
    });
    
    document.getElementById('moon-day-slider').addEventListener('input', (e) => {
        moonPhaseDay = parseInt(e.target.value);
        document.getElementById('moon-day-value').textContent = moonPhaseDay;
        updateCelestialBodies();
    });
    
    document.getElementById('show-earth').addEventListener('change', (e) => {
        earthMesh.visible = e.target.checked;
    });
    
    document.getElementById('show-atmosphere').addEventListener('change', (e) => {
        atmosphereMesh.visible = e.target.checked;
        if (sunSpotMesh) sunSpotMesh.visible = e.target.checked;
        if (moonSpotMesh) moonSpotMesh.visible = e.target.checked;
    });
    
    document.getElementById('show-dome').addEventListener('change', (e) => {
        domeMesh.visible = e.target.checked;
    });
    
    document.getElementById('show-sun').addEventListener('change', (e) => {
        if (sunMesh) sunMesh.visible = e.target.checked;
        if (sunProjectionRay) sunProjectionRay.visible = e.target.checked;
    });
    
    document.getElementById('show-moon').addEventListener('change', (e) => {
        if (moonMesh) moonMesh.visible = e.target.checked;
        if (moonProjectionRay) moonProjectionRay.visible = e.target.checked;
    });
    
    document.getElementById('show-grid').addEventListener('change', (e) => {
        gridHelper.visible = e.target.checked;
    });
    
    document.getElementById('reset-camera').addEventListener('click', () => {
        camera.position.set(400, 250, 400);
        camera.lookAt(0, 0, 0);
        controls.reset();
    });
    
    document.getElementById('animate-toggle').addEventListener('click', (e) => {
        isAnimating = !isAnimating;
        e.target.textContent = isAnimating ? '⏸️ Пауза' : '▶️ Анимация';
    });
    
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
    
    if (isAnimating) {
        hourOfDay += 0.05;
        if (hourOfDay >= 24) {
            hourOfDay = 0;
            dayOfYear++;
            if (dayOfYear > 365) dayOfYear = 1;
            document.getElementById('day-slider').value = dayOfYear;
            document.getElementById('day-value').textContent = dayOfYear;
        }
        document.getElementById('hour-slider').value = hourOfDay;
        document.getElementById('hour-value').textContent = Math.floor(hourOfDay) + ':' + String(Math.floor((hourOfDay % 1) * 60)).padStart(2, '0');
        updateCelestialBodies();
    }
    
    if (domeMesh) domeMesh.rotation.y += 0.0003;
    if (centralLightSource) centralLightSource.rotation.y += 0.001;
    
    controls.update();
    renderer.render(scene, camera);
}

// ============================================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
