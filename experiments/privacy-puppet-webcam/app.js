import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/+esm";
import { mapFace, clamp, jawAngle } from "./face-map.mjs";

// Isolated technical spike: no backend, no face uploads, no paid APIs.
// Upstream sample models: PrivacyPuppet (MIT repository; see README and asset caveats).
const ORIGIN = "https://cdn.jsdelivr.net/gh/privacypuppet/privacypuppet@ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/";
const FALLBACK = "https://raw.githubusercontent.com/privacypuppet/privacypuppet/ff1b635eba22d782423a6d81233e8deca7f6d1bd/public/mpfb_models/";
const AVATARS = {
  liam: { file: "liam-v2.glb", y: -1.45 },
  yuki: { file: "yuki-v2.glb", y: -1.15 },
  kofi: { file: "kofi-v2.glb", y: -1.45 },
};
const $ = (id) => document.getElementById(id);
const canvas = $("stage");
const video = $("camera");
const message = $("message");
const modelState = $("modelState");
const trackingState = $("trackingState");
const recordButton = $("record");
const startButton = $("start");
const stopButton = $("stop");
const calibrateButton = $("calibrate");
const avatarSelect = $("avatar");
const jawMeter = $("jawMeter");
const blinkLMeter = $("blinkLMeter");
const blinkRMeter = $("blinkRMeter");
const rigSupport = $("rigSupport");
const testJaw = $("testJaw");
const testBlink = $("testBlink");
let testJawUntil = 0;
let testBlinkUntil = 0;


let stream = null;
let landmarker = null;
let pose = null;
let neutral = null;
let loopId = 0;
let lastVideoTime = -1;
let lastProcessAt = 0;
let lastPresence = "";
let rig = null;
let currentModel = null;
let loadToken = 0;
let recorder = null;
let recorderStream = null;
let microphone = null;
let chunks = [];
let lastRecordingUrl = null;

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.24;
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
camera.position.set(0, 0, 0.82);
camera.lookAt(0, 0, 0);

const root = new THREE.Group();
root.position.y = -0.1;
scene.add(root);
const ambient = new THREE.AmbientLight(0xbcd3e7, 1.45);
const key = new THREE.DirectionalLight(0xffe6cf, 2.1);
key.position.set(2, 3, 4);
const fill = new THREE.DirectionalLight(0x94beff, 1.2);
fill.position.set(-3, 1, -1);
scene.add(ambient, key, fill);

function setLighting(name) {
  if (name === "noir") {
    scene.background = new THREE.Color("#080e18");
    ambient.intensity = 0.75; key.intensity = 2.6; fill.intensity = 0.55;
    key.color.set("#e7ecff"); fill.color.set("#477dba");
  } else if (name === "warm") {
    scene.background = new THREE.Color("#251c1b");
    ambient.intensity = 1.25; key.intensity = 2.2; fill.intensity = 0.8;
    key.color.set("#ffcd9b"); fill.color.set("#937dab");
  } else {
    scene.background = new THREE.Color("#141d29");
    ambient.intensity = 1.45; key.intensity = 2.1; fill.intensity = 1.2;
    key.color.set("#ffe6cf"); fill.color.set("#94beff");
  }
}
setLighting("studio");

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener("resize", resize);

function getBones(object) {
  const bones = {};
  const meshes = [];
  object.traverse((node) => {
    if (node.isBone) bones[node.name.toLowerCase()] = node;
    if (node.isMesh) {
      meshes.push(node);
      node.frustumCulled = false;
      // The source models contain overlapping meshes and transparent eye layers.
      if (node.name.toLowerCase().includes("low-poly")) node.visible = false;
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!mat || typeof mat.roughness !== "number") continue;
        mat.roughness = Math.min(1, mat.roughness + 0.1);
        const n = (mat.name || "").toLowerCase();
        if (n.includes("body")) {
          mat.transparent = false;
          mat.depthWrite = true;
        }
        if (n.includes("makeskin") || node.name.toLowerCase().includes("high-poly")) {
          mat.transparent = true;
          mat.alphaTest = 0.5;
          mat.depthWrite = true;
        }
        mat.needsUpdate = true;
      }
    }
  });
  const bone = (...names) => names.map((name) => bones[name]).find(Boolean) || null;
  const head = bone("head"), neck = bone("neck", "neck01", "neck02");
  const jaw = bone("jaw");
  const leftEye = bone("eye.l", "eyel");
  const rightEye = bone("eye.r", "eyer");
  const nodes = { head, neck, jaw, leftEye, rightEye };
  const rest = Object.fromEntries(
    Object.entries(nodes).map(([name, node]) => [name, node?.quaternion.clone() ?? null])
  );
  return { nodes, rest, meshes };
}

function hasMorphTargets(meshes, candidates) {
  return meshes.some((mesh) => {
    const d = mesh.morphTargetDictionary;
    return d && candidates.some((name) => d[name] !== undefined);
  });
}

function updateRigCapabilities() {
  if (!rig) {
    rigSupport.textContent = "El avatar todavía no está disponible.";
    testJaw.disabled = true;
    testBlink.disabled = true;
    return;
  }
  const hasJaw = Boolean(rig.nodes.jaw) || hasMorphTargets(rig.meshes, ["jawOpen", "mouthOpen"]);
  const hasBlink = hasMorphTargets(rig.meshes, ["eyeBlinkLeft", "blink_left"])
    && hasMorphTargets(rig.meshes, ["eyeBlinkRight", "blink_right"]);
  testJaw.disabled = !hasJaw;
  testBlink.disabled = !hasBlink;
  rigSupport.textContent = "Avatar: mandíbula " + (hasJaw ? "compatible" : "sin control")
    + " · párpados " + (hasBlink ? "compatibles" : "SIN blendshapes de parpadeo");
}

function updateSignals(state) {
  jawMeter.textContent = state ? Math.round(state.jaw * 100) + "%" : "—";
  blinkLMeter.textContent = state ? Math.round(state.blinkLeft * 100) + "%" : "—";
  blinkRMeter.textContent = state ? Math.round(state.blinkRight * 100) + "%" : "—";
}

const loader = new GLTFLoader();
function loadGLB(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
async function loadModel(name) {
  const token = ++loadToken;
  const config = AVATARS[name];
  if (!config) return;
  modelState.textContent = "Descargando modelo 3D (15–18 MB)...";
  avatarSelect.disabled = true;
  recordButton.disabled = true;
  try {
    let gltf;
    try {
      gltf = await loadGLB(ORIGIN + config.file);
    } catch (firstError) {
      console.warn("CDN de modelos no disponible; intentando repositorio original.", firstError);
      gltf = await loadGLB(FALLBACK + config.file);
    }
    if (token !== loadToken) return;
    if (currentModel) root.remove(currentModel);
    currentModel = gltf.scene;
    currentModel.position.set(0, config.y, 0);
    root.add(currentModel);
    rig = getBones(currentModel);
    updateRigCapabilities();
    modelState.textContent = name.toUpperCase() + " · Modelo 3D cargado";
    message.textContent = "Listo. Activá la cámara para controlar la cabeza y la mandíbula.";
    recordButton.disabled = !stream;
  } catch (error) {
    if (token !== loadToken) return;
    rig = null;
    updateRigCapabilities();
    modelState.textContent = "Error al cargar modelo";
    message.textContent = "No se pudo descargar el modelo. Probá otro personaje o revisá tu conexión.";
    console.error(error);
  } finally {
    if (token === loadToken) avatarSelect.disabled = false;
  }
}

const qRot = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();
const xAxis = new THREE.Vector3(1, 0, 0);
const euler = new THREE.Euler();
function applyBone(node, rest, x, y = 0, z = 0, factor = 0.17) {
  if (!node || !rest) return;
  euler.set(x, y, z, "XYZ");
  qRot.setFromEuler(euler);
  qTarget.copy(rest).multiply(qRot);
  node.quaternion.slerp(qTarget, factor);
}
function animateRig(t) {
  if (!rig) return;
  const state = { yaw: 0, pitch: 0, roll: 0, jaw: 0, blinkLeft: 0, blinkRight: 0, lookLeft: 0, ...pose };
  if (performance.now() < testJawUntil) state.jaw = 1;
  if (performance.now() < testBlinkUntil) {
    state.blinkLeft = 1;
    state.blinkRight = 1;
  }
  const idle = Math.sin(t * 0.65) * 0.012;
  const { nodes, rest, meshes } = rig;
  applyBone(nodes.head, rest.head, state.pitch * 0.72 + idle, -state.yaw * 0.75, state.roll * 0.5);
  applyBone(nodes.neck, rest.neck, state.pitch * 0.22, -state.yaw * 0.22);
  if (nodes.jaw) {
    qRot.setFromAxisAngle(xAxis, performance.now() < testJawUntil ? 0.30 : jawAngle(state.jaw));
    qTarget.copy(rest.jaw).multiply(qRot);
    nodes.jaw.quaternion.slerp(qTarget, 0.2);
  }
  applyBone(nodes.leftEye, rest.leftEye, 0, state.lookLeft * 0.1);
  applyBone(nodes.rightEye, rest.rightEye, 0, state.lookLeft * 0.1);
  // Different assets expose different morph targets. MPFB models may not blink.
  for (const mesh of meshes) {
    const dict = mesh.morphTargetDictionary, influences = mesh.morphTargetInfluences;
    if (!dict || !influences) continue;
    const set = (keys, value) => {
      const index = keys.map((k) => dict[k]).find((v) => v !== undefined);
      if (index !== undefined) influences[index] = THREE.MathUtils.lerp(influences[index], value, 0.25);
    };
    set(["jawOpen", "mouthOpen"], state.jaw);
    set(["eyeBlinkLeft", "blink_left"], state.blinkLeft);
    set(["eyeBlinkRight", "blink_right"], state.blinkRight);
  }
}

let frameCount = 0;
let sampleAt = performance.now();
function renderLoop(time) {
  requestAnimationFrame(renderLoop);
  animateRig(time / 1000);
  renderer.render(scene, camera);
  frameCount++;
  if (time - sampleAt > 1000) {
    $("fps").textContent = Math.round(frameCount * 1000 / (time - sampleAt)) + " FPS (render)";
    sampleAt = time; frameCount = 0;
  }
}
resize();
requestAnimationFrame(renderLoop);
loadModel("liam");

function presence(text, active) {
  if (lastPresence === text) return;
  lastPresence = text;
  trackingState.textContent = text;
  $("liveDot").classList.toggle("on", active);
}

function processCamera() {
  if (!stream || !landmarker) return;
  const now = performance.now();
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastProcessAt >= 50) {
    lastProcessAt = now;
    lastVideoTime = video.currentTime;
    try {
      const result = landmarker.detectForVideo(video, now);
      const next = mapFace(result, neutral);
      if (next) {
        neutral = next.neutral;
        pose = next;
        updateSignals(next);
        presence("Rostro detectado · siguiendo expresión", true);
      } else {
        pose = null;
        updateSignals(null);
        presence("Cámara activa · no se detecta rostro", false);
      }
    } catch (error) {
      console.error("Face Landmarker falló:", error);
      message.textContent = "Error de seguimiento. Detené y reactivá la cámara.";
      stopCamera();
      return;
    }
  }
  loopId = requestAnimationFrame(processCamera);
}

async function initLandmarker() {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm");
  const options = {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
  try {
    return await FaceLandmarker.createFromOptions(vision, options);
  } catch (error) {
    console.warn("GPU no disponible; usando CPU.", error);
    options.baseOptions.delegate = "CPU";
    return await FaceLandmarker.createFromOptions(vision, options);
  }
}

async function startCamera() {
  if (stream) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    message.textContent = "Necesitás HTTPS o localhost y un navegador con acceso a cámara.";
    return;
  }
  startButton.disabled = true;
  message.textContent = "Solicitando permiso de cámara...";
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    $("cameraPlaceholder").hidden = true;
    message.textContent = "Cargando modelo de detección facial...";
    landmarker = await initLandmarker();
    neutral = null; pose = null; lastVideoTime = -1; lastProcessAt = 0; lastPresence = "";
    stopButton.disabled = false;
    calibrateButton.disabled = false;
    recordButton.disabled = !rig;
    presence("Cámara activa · buscando rostro", false);
    message.textContent = "Mirá de frente para calibrar; luego girá la cabeza y hablá.";
    loopId = requestAnimationFrame(processCamera);
  } catch (error) {
    console.error(error);
    message.textContent = error?.name === "NotAllowedError"
      ? "Permiso rechazado. Habilitá la cámara en el navegador."
      : "No se pudo activar la cámara o cargar MediaPipe. Revisá permisos, conexión y consola.";
    stopCamera();
  } finally {
    startButton.disabled = Boolean(stream);
  }
}

function stopCamera() {
  cancelAnimationFrame(loopId);
  if (stream) stream.getTracks().forEach((track) => track.stop());
  if (landmarker) landmarker.close();
  landmarker = null; stream = null;
  video.pause(); video.srcObject = null;
  neutral = null; pose = null; lastPresence = "";
  updateSignals(null);
  $("cameraPlaceholder").hidden = false;
  stopButton.disabled = true;
  calibrateButton.disabled = true;
  recordButton.disabled = true;
  startButton.disabled = false;
  presence("Cámara apagada · movimiento de reposo", false);
  if (recorder?.state === "recording") recorder.stop();
}

function finishRecording() {
  const mime = recorder?.mimeType || "video/webm";
  const extension = mime.includes("mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mime });
  if (blob.size) {
    if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
    lastRecordingUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = lastRecordingUrl;
    a.download = "ia-cinema-lab-camera-study." + extension;
    document.body.append(a);
    a.click(); a.remove();
    message.textContent = "Grabación descargada (" + extension.toUpperCase() + ").";
  } else {
    message.textContent = "La grabación resultó vacía; probá otro navegador.";
  }
  chunks = [];
  recorderStream?.getTracks().forEach((track) => track.stop());
  microphone?.getTracks().forEach((track) => track.stop());
  recorderStream = null; microphone = null; recorder = null;
  recordButton.textContent = "● Grabar escena";
  recordButton.disabled = !stream || !rig;
}

async function toggleRecording() {
  if (recorder?.state === "recording") {
    recorder.stop();
    recordButton.disabled = true;
    return;
  }
  if (!rig || !stream) return;
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    message.textContent = "Este navegador no permite grabar el canvas.";
    return;
  }
  recordButton.disabled = true;
  message.textContent = "Preparando grabación. El micrófono es opcional...";
  try {
    try {
      microphone = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      microphone = null;
      message.textContent = "Sin micrófono; se grabará solo el avatar.";
    }
    recorderStream = canvas.captureStream(24);
    if (microphone?.getAudioTracks()[0]) {
      recorderStream.addTrack(microphone.getAudioTracks()[0]);
    }
    const formats = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const format = formats.find((f) => MediaRecorder.isTypeSupported(f));
    recorder = new MediaRecorder(recorderStream, format ? { mimeType: format } : undefined);
    chunks = [];
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = (event) => { console.error(event); message.textContent = "Falló la grabación."; };
    recorder.onstop = finishRecording;
    recorder.start(250);
    recordButton.textContent = "■ Detener grabación";
    message.textContent = "Grabando escena y micrófono (si está habilitado).";
  } catch (error) {
    console.error(error);
    message.textContent = "No se pudo iniciar la grabación.";
    recorderStream?.getTracks().forEach((track) => track.stop());
    microphone?.getTracks().forEach((track) => track.stop());
    recorderStream = null; microphone = null; recorder = null;
  } finally {
    recordButton.disabled = false;
  }
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
calibrateButton.addEventListener("click", () => {
  neutral = null;
  message.textContent = "Calibración reiniciada. Mirá de frente a la cámara.";
});
recordButton.addEventListener("click", toggleRecording);
testJaw.addEventListener("click", () => {
  testJawUntil = performance.now() + 1800;
  message.textContent = "Prueba manual: la mandíbula debería abrirse sin depender de la webcam.";
});
testBlink.addEventListener("click", () => {
  testBlinkUntil = performance.now() + 900;
  message.textContent = "Prueba manual de párpados: disponible solo con morph targets compatibles.";
});
avatarSelect.addEventListener("change", () => loadModel(avatarSelect.value));
$("lighting").addEventListener("change", (event) => setLighting(event.target.value));
window.addEventListener("pagehide", () => {
  stopCamera();
  if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
});
