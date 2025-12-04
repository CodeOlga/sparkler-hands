import "./style.css";
import * as THREE from "three";
import HandsModule from "@mediapipe/hands";
import CameraModule from "@mediapipe/camera_utils";

const { Hands } = HandsModule;
const { Camera: MediaPipeCamera } = CameraModule;

/**
 * ---------------------------------------------------------
 *  НАЛАШТУВАННЯ THREE.JS
 * ---------------------------------------------------------
 */

const threeCanvas = document.getElementById("three-canvas");

const renderer = new THREE.WebGLRenderer({
  canvas: threeCanvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050608, 0.08);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 8);

const particleRoot = new THREE.Group();
scene.add(particleRoot);

/**
 * Створюємо текстуру для частинок через CanvasTexture,
 * щоб не зберігати окремий файл.
 */
function createParticleTexture() {
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

const particleCount = 30000;
const particleGeometry = new THREE.BufferGeometry();

const particlePositions = new Float32Array(particleCount * 3);
const workingTargetPositions = new Float32Array(particleCount * 3);

/**
 * Словник цільових фігур:
 * shapeTargets.heart, shapeTargets.flower, ...
 */
const shapeTargets = {};

const particleTexture = createParticleTexture();

let particleColor = new THREE.Color("#ffcc88");

const particleMaterial = new THREE.PointsMaterial({
  size: 0.04,
  map: particleTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: particleColor,
});

const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
particleRoot.add(particlePoints);

/**
 * ---------------------------------------------------------
 *  ГЕНЕРАЦІЯ ФІГУР (HEART, FLOWER, SATURN, BUDDHA, FIREWORK)
 * ---------------------------------------------------------
 */

function fillArrayWithShape(shapeName, targetArray) {
  const random = Math.random;

  for (let index = 0; index < particleCount; index += 1) {
    let x;
    let y;
    let z;

    const randomValue = random();

    switch (shapeName) {
      case "heart": {
        // 2D серце + невелика глибина по Z
        const angle = random() * Math.PI * 2;
        const radius = 0.8 + random() * 0.1;
        const scale = 0.9;

        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        const heartX = 16 * Math.pow(sinAngle, 3) * scale * 0.06 * radius; // нормалізація
        const heartY =
          (13 * cosAngle -
            5 * Math.cos(2 * angle) -
            2 * Math.cos(3 * angle) -
            Math.cos(4 * angle)) *
          scale *
          0.06 *
          radius;

        x = heartX;
        y = heartY;
        z = (random() - 0.5) * 0.6;
        break;
      }
      case "flower": {
        // Полярна квітка r = cos(k * θ)
        const angle = random() * Math.PI * 2;
        const petals = 6;
        const radius = 1.2 * Math.cos(petals * angle) + 1.4;
        const distance = radius * 0.4 + random() * 0.15;

        x = Math.cos(angle) * distance;
        y = Math.sin(angle) * distance;
        z = (random() - 0.5) * 0.7;
        break;
      }
      case "saturn": {
        // поєднання кулі + тороїдальне кільце
        if (randomValue < 0.45) {
          // куля
          const sphericalRadius = 0.7;
          const theta = random() * Math.PI * 2;
          const phi = Math.acos(2 * random() - 1);
          const radial = sphericalRadius + (random() - 0.5) * 0.1;

          x = radial * Math.sin(phi) * Math.cos(theta);
          y = radial * Math.cos(phi);
          z = radial * Math.sin(phi) * Math.sin(theta);
        } else {
          // кільце (тор)
          const ringRadius = 1.3;
          const ringThickness = 0.15;
          const angle = random() * Math.PI * 2;
          const offset = (random() - 0.5) * ringThickness;

          x = (ringRadius + offset * Math.cos(angle * 2)) * Math.cos(angle);
          z = (ringRadius + offset * Math.cos(angle * 2)) * Math.sin(angle);
          y = offset * 2;
        }
        break;
      }
      case "buddha": {
        /**
         * Спрощена силуетна фігура "Будда":
         * - нижній еліпсоїд (ноги/подушка)
         * - середній (торс)
         * - верхній (голова)
         */
        if (randomValue < 0.4) {
          // нижня частина
          const angle = random() * Math.PI * 2;
          const radius = 1.2 + random() * 0.1;
          x = Math.cos(angle) * radius * 0.6;
          z = Math.sin(angle) * radius * 0.7;
          y = -0.6 + (random() - 0.5) * 0.2;
        } else if (randomValue < 0.8) {
          // торс
          const angle = random() * Math.PI * 2;
          const radius = 0.8 + random() * 0.1;
          x = Math.cos(angle) * radius * 0.45;
          z = Math.sin(angle) * radius * 0.5;
          y = -0.1 + (random() - 0.5) * 0.35;
        } else {
          // голова
          const angle = random() * Math.PI * 2;
          const radius = 0.35 + random() * 0.05;
          x = Math.cos(angle) * radius * 0.8;
          z = Math.sin(angle) * radius * 0.8;
          y = 0.7 + (random() - 0.5) * 0.15;
        }
        break;
      }
      case "firework":
      default: {
        // Радіальні промені від центру
        const rayCount = 18;
        const rayIndex = Math.floor(random() * rayCount);
        const rayAngle = (rayIndex / rayCount) * Math.PI * 2;
        const rayElevation = (random() - 0.5) * 0.8;
        const rayLength = 0.2 + Math.pow(random(), 0.4) * 2.4;

        const baseDirection = new THREE.Vector3(
          Math.cos(rayAngle),
          rayElevation,
          Math.sin(rayAngle)
        ).normalize();

        const distanceAlongRay = random() * rayLength;
        const jitter = 0.08;

        x =
          baseDirection.x * distanceAlongRay +
          (random() - 0.5) * jitter * distanceAlongRay;
        y =
          baseDirection.y * distanceAlongRay +
          (random() - 0.5) * jitter * distanceAlongRay;
        z =
          baseDirection.z * distanceAlongRay +
          (random() - 0.5) * jitter * distanceAlongRay;
        break;
      }
    }

    const arrayIndex = index * 3;
    targetArray[arrayIndex] = x;
    targetArray[arrayIndex + 1] = y;
    targetArray[arrayIndex + 2] = z;
  }
}

/**
 * Ініціалізуємо всі цілі фігури й початкове положення.
 */
function initializeShapes() {
  shapeTargets.heart = new Float32Array(particleCount * 3);
  shapeTargets.flower = new Float32Array(particleCount * 3);
  shapeTargets.saturn = new Float32Array(particleCount * 3);
  shapeTargets.buddha = new Float32Array(particleCount * 3);
  shapeTargets.firework = new Float32Array(particleCount * 3);

  fillArrayWithShape("heart", shapeTargets.heart);
  fillArrayWithShape("flower", shapeTargets.flower);
  fillArrayWithShape("saturn", shapeTargets.saturn);
  fillArrayWithShape("buddha", shapeTargets.buddha);
  fillArrayWithShape("firework", shapeTargets.firework);

  // Поточні позиції копіюємо з серця
  particlePositions.set(shapeTargets.heart);
  workingTargetPositions.set(shapeTargets.heart);

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );
}

initializeShapes();

let currentShapeName = "heart";

function setTargetShape(shapeName) {
  if (!shapeTargets[shapeName]) return;
  currentShapeName = shapeName;
  workingTargetPositions.set(shapeTargets[shapeName]);
}

/**
 * ---------------------------------------------------------
 *  КЕРУВАННЯ МИШЕЮ / ТАЧПАДОМ (обертання)
 * ---------------------------------------------------------
 */

let isPointerDragging = false;
let previousPointerX = 0;
let previousPointerY = 0;
let accumulatedRotationX = 0;
let accumulatedRotationY = 0;

const pointerRotationSensitivity = 0.005;

function handlePointerDown(event) {
  isPointerDragging = true;
  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
}

function handlePointerMove(event) {
  if (!isPointerDragging) return;

  const deltaX = event.clientX - previousPointerX;
  const deltaY = event.clientY - previousPointerY;

  previousPointerX = event.clientX;
  previousPointerY = event.clientY;

  accumulatedRotationY += deltaX * pointerRotationSensitivity;
  accumulatedRotationX += deltaY * pointerRotationSensitivity;
}

function handlePointerUp() {
  isPointerDragging = false;
}

threeCanvas.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", handlePointerUp);

/**
 * ---------------------------------------------------------
 *  MEDIAPIPE HANDS
 * ---------------------------------------------------------
 */

const webcamVideoElement = document.getElementById("webcam");
const debugCanvas = document.getElementById("debug-canvas");
const debugContext = debugCanvas.getContext("2d");
const toggleHandsCheckbox = document.getElementById("toggle-hands");
const scaleValueElement = document.getElementById("scale-value");

debugCanvas.width = 320;
debugCanvas.height = 180;

let handControlledScale = 1.0;
let handRotationOffsetX = 0;
let handRotationOffsetY = 0;

let isHandsInitialized = false;
let mediaPipeCameraInstance = null;
let handsInstance = null;

async function setupHands() {
  if (isHandsInitialized) return;

  // Конфіг ремонтує шлях до wasm/моделей через CDN
  handsInstance = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  handsInstance.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    modelComplexity: 1,
  });

  handsInstance.onResults(handleHandResults);

  // Доступ до вебкамери
  mediaPipeCameraInstance = new MediaPipeCamera(webcamVideoElement, {
    onFrame: async () => {
      await handsInstance.send({ image: webcamVideoElement });
    },
    width: 640,
    height: 360,
  });

  try {
    await mediaPipeCameraInstance.start();
    isHandsInitialized = true;
  } catch (error) {
    console.error("Не вдалося запустити вебкамеру або MediaPipe Hands", error);
  }
}

function stopHands() {
  if (mediaPipeCameraInstance) {
    mediaPipeCameraInstance.stop();
  }
  isHandsInitialized = false;
}

/**
 * Обробка результатів MediaPipe Hands
 */
function handleHandResults(results) {
  debugContext.save();
  debugContext.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    debugContext.restore();
    return;
  }

  const landmarks = results.multiHandLandmarks[0];

  // Малюємо руку на debug-canvas
  debugContext.drawImage(
    results.image,
    0,
    0,
    debugCanvas.width,
    debugCanvas.height
  );

  debugContext.fillStyle = "#00ffcc";
  landmarks.forEach((landmark) => {
    const x = landmark.x * debugCanvas.width;
    const y = landmark.y * debugCanvas.height;
    debugContext.beginPath();
    debugContext.arc(x, y, 3, 0, Math.PI * 2);
    debugContext.fill();
  });

  debugContext.restore();

  // Розрахунок pinch-жесту (великий + вказівний)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const pinchDistance = Math.sqrt(
    Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
  );

  const desiredScale = THREE.MathUtils.clamp(
    (0.18 - pinchDistance) * 6.0 + 1.0,
    0.5,
    2.5
  );

  // Легке згладжування
  handControlledScale = handControlledScale * 0.9 + desiredScale * 0.1;

  scaleValueElement.textContent = handControlledScale.toFixed(2).toString();

  // Центр руки для обертання
  let sumX = 0;
  let sumY = 0;
  landmarks.forEach((landmark) => {
    sumX += landmark.x;
    sumY += landmark.y;
  });

  const centerX = sumX / landmarks.length; // 0..1
  const centerY = sumY / landmarks.length; // 0..1

  const centeredX = centerX - 0.5;
  const centeredY = centerY - 0.5;

  const rotationSensitivity = 2.8;

  handRotationOffsetY = -centeredX * rotationSensitivity;
  handRotationOffsetX = centeredY * rotationSensitivity;
}

/**
 * ---------------------------------------------------------
 *  ІНТЕРФЕЙС (форма, колір, перемикач hands)
 * ---------------------------------------------------------
 */

const shapeSelectElement = document.getElementById("shape-select");
const colorInputElement = document.getElementById("color-input");

shapeSelectElement.addEventListener("change", (event) => {
  const selectedShapeName = event.target.value;
  setTargetShape(selectedShapeName);
});

colorInputElement.addEventListener("input", (event) => {
  const newColor = new THREE.Color(event.target.value);
  particleColor = newColor;
  particleMaterial.color = particleColor;
});

toggleHandsCheckbox.addEventListener("change", (event) => {
  if (event.target.checked) {
    setupHands();
  } else {
    stopHands();
  }
});

// Запускаємо hands одразу за замовчуванням
setupHands();

/**
 * ---------------------------------------------------------
 *  АНІМАЦІЙНИЙ ЦИКЛ
 * ---------------------------------------------------------
 */

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Мерехтіння
  const timeElapsed = clock.elapsedTime;
  const flicker =
    0.2 + Math.sin(timeElapsed * 5.0) * 0.05 + Math.random() * 0.03;
  particleMaterial.size = 0.045 + flicker * 0.02;

  // Плавна морфінг-анімація до цільової фігури
  const morphFactor = 0.1;

  for (let index = 0; index < particleCount * 3; index += 1) {
    const currentValue = particlePositions[index];
    const targetValue = workingTargetPositions[index];

    particlePositions[index] =
      currentValue + (targetValue - currentValue) * morphFactor;
  }

  particleGeometry.attributes.position.needsUpdate = true;

  // Обертання
  const baseRotationSpeed = 0.05;

  particleRoot.rotation.y += baseRotationSpeed * deltaTime;
  particleRoot.rotation.y += accumulatedRotationY;
  particleRoot.rotation.x += accumulatedRotationX;

  // Додаємо контроль з руки, якщо увімкнено
  if (toggleHandsCheckbox.checked && isHandsInitialized) {
    particleRoot.rotation.x =
      particleRoot.rotation.x * 0.7 + handRotationOffsetX * 0.3;
    particleRoot.rotation.y =
      particleRoot.rotation.y * 0.7 + handRotationOffsetY * 0.3;
    particleRoot.scale.set(
      handControlledScale,
      handControlledScale,
      handControlledScale
    );
  }

  renderer.render(scene, camera);

  // Поступово "забуваємо" рух мишею (щоб не крутило безкінечно)
  accumulatedRotationX *= 0.85;
  accumulatedRotationY *= 0.85;
}

animate();

/**
 * ---------------------------------------------------------
 *  РЕСАЙЗ ВІКНА
 * ---------------------------------------------------------
 */

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", handleResize);
