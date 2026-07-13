import assert from "node:assert/strict";
import * as THREE from "three";
import { Arena } from "../src/arena.js";
import { CameraController } from "../src/camera.js";
import { CombatSystem } from "../src/combat.js";
import { Effects } from "../src/effects.js";
import { Monster } from "../src/monster.js";
import { ATTACKS, clamp, hitDamage, nextBuildingState } from "../src/simulation.js";

assert.equal(hitDamage(10, 0, false), 10);
assert.equal(hitDamage(10, 2, false), 12);
assert.equal(hitDamage(10, 0, true), 3);
assert.equal(hitDamage(10, 1, false, 1.15), 13);
assert.equal(clamp(120, 0, 100), 100);
assert.equal(clamp(-5, 0, 100), 0);
assert.equal(nextBuildingState(100), "intact");
assert.equal(nextBuildingState(60), "damaged");
assert.equal(nextBuildingState(0), "collapsing");
assert.ok(ATTACKS.light.recovery < ATTACKS.heavy.recovery);
assert.ok(ATTACKS.special.reach > ATTACKS.light.reach);
assert.deepEqual(
  Object.fromEntries(["light", "heavy", "special", "stomp", "throw"].map(type => [type, ATTACKS[type].hitStop])),
  { light: .035, heavy: .065, special: .085, stomp: .06, throw: .08 },
);

const scene = new THREE.Group();
const effects = new Effects(scene);
effects.requestHitStop(.035);
effects.requestHitStop(.08);
assert.equal(effects.hitStop, .08);
assert.equal(effects.consumeHitStop(.02), true);
assert.ok(Math.abs(effects.hitStop - .06) < Number.EPSILON);
assert.equal(effects.consumeHitStop(.08), true);
assert.equal(effects.consumeHitStop(.01), false);

const attacker = new Monster(scene, "brute", new THREE.Vector3(0, 0, 0), 0);
const blocker = new Monster(scene, "raptor", new THREE.Vector3(0, 0, 3), Math.PI);
blocker.blocking = true;
new CombatSystem([attacker, blocker], { damageInRadius() {} }, effects).perform(attacker, "heavy");
assert.ok(Math.abs(effects.hitStop - ATTACKS.heavy.hitStop * .55) < Number.EPSILON);
effects.dispose();

const cameraEffects = new Effects(new THREE.Group());
cameraEffects.shake(1, new THREE.Vector3(1, 0, 0));
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 9, -22);
const cameraController = new CameraController(camera, cameraEffects, 0);
const cameraPlayer = { position: new THREE.Vector3(0, 0, -9), forward: () => new THREE.Vector3(0, 0, 1) };
const cameraEnemy = { position: new THREE.Vector3(0, 0, 9) };
cameraController.update(1 / 60, cameraPlayer, cameraEnemy);
assert.ok(cameraController.basePosition);
assert.equal(camera.position.x, cameraController.basePosition.x);
cameraEffects.dispose();

const poseScene = new THREE.Group();
const poseMonster = new Monster(poseScene, "brute", new THREE.Vector3());
poseMonster.startAction("heavy");
poseMonster.update(.2, { perform() {} }, { monsterStep() {}, checkThrownCollision() {} });
assert.notEqual(poseMonster.visual, poseMonster.root);
assert.ok(poseMonster.visual.scale.y < 1);
assert.ok(poseMonster.visual.rotation.x < 0);

const knockedMonster = new Monster(new THREE.Group(), "brute", new THREE.Vector3());
knockedMonster.receiveHit(0, new THREE.Vector3(2, 1.2, 3), 0, null);
assert.deepEqual(knockedMonster.velocity.toArray(), [2, 0, 3]);
assert.equal(knockedMonster.verticalVelocity, 1.2);

const arenaScene = new THREE.Group();
const arenaEffects = new Effects(arenaScene);
const arena = new Arena(arenaScene, arenaEffects);
const building = arena.buildings[0];
arena.damageBuilding(building, 100);
arena.update(.4);
assert.ok(building.group.position.y < 0);
arena.update(.7);
assert.equal(building.state, "rubble");
assert.equal(building.group.visible, false);
assert.equal(arenaEffects.hitStop, .06);
arenaEffects.dispose();

console.log("combat and destruction checks passed");
