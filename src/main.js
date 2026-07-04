import * as THREE from "three";
import "./style.css";
import { Arena } from "./arena.js";
import { CameraController } from "./camera.js";
import { CombatSystem } from "./combat.js";
import { AIController, Input, PlayerController } from "./controllers.js";
import { Effects } from "./effects.js";
import { Monster } from "./monster.js";
import { UIManager } from "./ui.js";

const canvas = document.querySelector("#game");
const isCompactScreen = matchMedia("(max-width: 900px)").matches;
const maxPixelRatio = isCompactScreen ? 1.25 : 1.5;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8197a1);
scene.fog = new THREE.Fog(0x8197a1, 42, 88);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 160);

scene.add(new THREE.HemisphereLight(0xcde7ff, 0x3e4534, 1.8));
const sun = new THREE.DirectionalLight(0xffedcf, 3.2);
sun.position.set(-24, 42, -18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -42;
sun.shadow.camera.right = sun.shadow.camera.top = 42;
scene.add(sun);

const ui = new UIManager();
const input = new Input();
const clock = new THREE.Clock();
let world = null;
let game = null;
let state = "menu";

function disposeObjectTree(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse(object => {
    if (object.geometry && !object.geometry.userData?.keepAlive) geometries.add(object.geometry);
    const material = object.material;
    if (Array.isArray(material)) material.forEach(entry => entry && materials.add(entry));
    else if (material) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

function clearMatchWorld() {
  if (game?.effects) game.effects.dispose();
  if (!world) return;
  scene.remove(world);
  disposeObjectTree(world);
  renderer.renderLists.dispose();
  world = null;
  game = null;
}

function startMatch(kind) {
  clearMatchWorld();
  world = new THREE.Group();
  scene.add(world);

  const effects = new Effects(world);
  const arena = new Arena(world, effects);
  const enemyKind = kind === "brute" ? "raptor" : "brute";
  const player = new Monster(world, kind, new THREE.Vector3(0, 0, -9), 0);
  const enemy = new Monster(world, enemyKind, new THREE.Vector3(0, 0, 9), Math.PI);
  const fighters = [player, enemy];
  game = {
    effects,
    arena,
    player,
    enemy,
    combat: new CombatSystem(fighters, arena, effects),
    playerController: new PlayerController(player, input),
    aiController: new AIController(enemy, player, arena),
    cameraController: new CameraController(camera, effects),
    ended: false,
  };
  camera.position.set(0, 9, -22);
  state = "playing";
  input.flush();
  ui.showGame();
  clock.getDelta();
}

function goToMenu() {
  state = "menu";
  clearMatchWorld();
  ui.showMenu();
}

function setPaused(paused) {
  if (!game || game.ended) return;
  state = paused ? "paused" : "playing";
  ui.showPause(paused);
  input.flush();
  clock.getDelta();
}

ui.on("start", startMatch);
ui.on("resume", () => setPaused(false));
ui.on("menu", goToMenu);

addEventListener("keydown", event => {
  if (event.code !== "Escape" || event.repeat) return;
  if (state === "playing") setPaused(true);
  else if (state === "paused") setPaused(false);
});

addEventListener("blur", () => {
  if (state === "playing") setPaused(true);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio));
});

canvas.addEventListener("webglcontextlost", event => {
  event.preventDefault();
  if (state === "playing") setPaused(true);
});

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  if (state === "playing" && game) {
    game.playerController.update();
    game.aiController.update(dt);
    game.player.update(dt, game.combat, game.arena);
    game.enemy.update(dt, game.combat, game.arena);
    game.arena.update(dt);
    game.effects.update(dt);
    game.cameraController.update(dt, game.player, game.enemy);
    ui.update(dt, game.player, game.enemy);
    input.flush();

    if (!game.ended && (!game.player.alive || !game.enemy.alive)) {
      game.ended = true;
      state = "ended";
      setTimeout(() => ui.showResult(game.player.alive), 650);
    }
  }
  renderer.render(scene, camera);
});

ui.showMenu();
