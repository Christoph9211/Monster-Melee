import * as THREE from "three";
import { ATTACKS, clamp } from "./simulation.js";

const MONSTERS = {
  brute: { name: "Titan Brute", color: 0x8fbf3f, accent: 0xff7738, maxHealth: 130, speed: 5.2, turnSpeed: 2.25, power: 1.15, cooldown: 7 },
  raptor: { name: "Volt Raptor", color: 0x236d84, accent: 0x72e8ff, maxHealth: 100, speed: 7.2, turnSpeed: 3.1, power: .88, cooldown: 5 },
};

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .08 });

function part(geometry, color, position, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildBrute(stats) {
  const group = new THREE.Group();
  group.add(part(new THREE.SphereGeometry(1.8, 12, 8), stats.color, [0, 3.5, 0], [1.25, 1.25, .95]));
  group.add(part(new THREE.BoxGeometry(1.8, 1.5, 1.7), stats.color, [0, 5.35, .1]));
  group.add(part(new THREE.ConeGeometry(.25, .8, 5), stats.accent, [-.62, 6.35, 0]));
  group.add(part(new THREE.ConeGeometry(.25, .8, 5), stats.accent, [.62, 6.35, 0]));
  for (const side of [-1, 1]) {
    group.add(part(new THREE.CapsuleGeometry(.55, 2.2, 4, 8), stats.color, [side * 2.05, 3.45, 0], [1, 1, 1]));
    group.add(part(new THREE.CapsuleGeometry(.65, 1.7, 4, 8), stats.color, [side * .95, 1.35, 0], [1, 1, 1]));
  }
  return group;
}

function buildRaptor(stats) {
  const group = new THREE.Group();
  group.add(part(new THREE.CapsuleGeometry(1.15, 2.4, 6, 10), stats.color, [0, 3.7, 0], [1, 1.15, .8]));
  group.add(part(new THREE.ConeGeometry(1.1, 2.6, 5), stats.color, [0, 5.7, .55], [1, 1, .8]));
  for (let i = 0; i < 5; i++) group.add(part(new THREE.ConeGeometry(.22, .9, 4), stats.accent, [0, 4.2 - i * .7, -1.05 - i * .15], [1, 1, 1]));
  const tail = part(new THREE.ConeGeometry(.65, 5, 8), stats.color, [0, 2.8, -2.7], [1, 1, 1]);
  tail.rotation.x = Math.PI / 2.8;
  group.add(tail);
  for (const side of [-1, 1]) {
    const arm = part(new THREE.CapsuleGeometry(.28, 1.5, 4, 8), stats.color, [side * 1.2, 4.1, .7]);
    arm.rotation.z = side * .7;
    group.add(arm);
    group.add(part(new THREE.CapsuleGeometry(.42, 2, 4, 8), stats.color, [side * .75, 1.35, 0]));
  }
  return group;
}

export class Monster {
  constructor(scene, kind, position, angle = 0) {
    this.kind = kind;
    this.stats = MONSTERS[kind];
    this.name = this.stats.name;
    this.root = new THREE.Group();
    this.visual = kind === "brute" ? buildBrute(this.stats) : buildRaptor(this.stats);
    this.root.add(this.visual);
    this.root.position.copy(position);
    this.root.rotation.y = angle;
    scene.add(this.root);

    this.position = this.root.position;
    this.angle = angle;
    this.velocity = new THREE.Vector3();
    this.verticalVelocity = 0;
    this.health = this.stats.maxHealth;
    this.specialCooldown = 0;
    this.action = null;
    this.hitStun = 0;
    this.blocking = false;
    this.intent = { move: 0, turn: 0, sprint: false };
    this.combo = 0;
    this.comboTimer = 0;
    this.holding = null;
    this.heldBy = null;
    this.alive = true;
    this.radius = kind === "brute" ? 2.2 : 1.75;
  }

  forward() { return new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle)); }
  canAct() { return this.alive && !this.action && this.hitStun <= 0 && !this.heldBy; }

  jump() {
    if (this.canAct() && this.position.y <= .01) {
      this.verticalVelocity = this.kind === "brute" ? 8 : 10;
      this.blocking = false;
    }
  }

  startAction(type) {
    if (!this.canAct() || !ATTACKS[type]) return false;
    if (type === "special" && this.specialCooldown > 0) return false;
    this.action = { type, time: 0, fired: false };
    this.blocking = false;
    if (type === "special") this.specialCooldown = this.stats.cooldown;
    return true;
  }

  receiveHit(damage, knockback, stun, attacker, blocked = false) {
    if (!this.alive) return;
    this.health = clamp(this.health - damage, 0, this.stats.maxHealth);
    this.velocity.x += knockback.x;
    this.velocity.z += knockback.z;
    this.verticalVelocity += knockback.y;
    this.hitStun = Math.max(this.hitStun, stun);
    this.action = null;
    if (attacker) {
      attacker.combo = attacker.comboTimer > 0 ? Math.min(attacker.combo + 1, 3) : 1;
      attacker.comboTimer = .9;
    }
    if (this.health <= 0) {
      this.alive = false;
      this.blocking = false;
      if (this.holding) this.releaseHeld();
    } else if (blocked) {
      this.hitStun *= .45;
    }
  }

  releaseHeld(throwVelocity = null) {
    if (!this.holding) return null;
    const target = this.holding;
    target.heldBy = null;
    if (throwVelocity) target.velocity.copy(throwVelocity);
    this.holding = null;
    return target;
  }

  update(dt, combat, arena) {
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (!this.comboTimer) this.combo = 0;
    this.hitStun = Math.max(0, this.hitStun - dt);

    if (!this.alive) {
      this.visual.position.y = 0;
      this.visual.rotation.set(0, 0, 0);
      this.visual.scale.setScalar(1);
      this.root.rotation.z = THREE.MathUtils.damp(this.root.rotation.z, Math.PI / 2, 5, dt);
      return;
    }

    if (this.heldBy) {
      this.position.copy(this.heldBy.position).add(this.heldBy.forward().multiplyScalar(2.5));
      this.position.y = this.heldBy.position.y + 4;
      return;
    }

    if (this.canAct()) {
      this.angle += this.intent.turn * this.stats.turnSpeed * dt;
      const speed = this.stats.speed * (this.intent.sprint ? 1.65 : 1);
      this.position.addScaledVector(this.forward(), this.intent.move * speed * dt);
      if (Math.abs(this.intent.move) > .05) arena.monsterStep(this, speed * Math.abs(this.intent.move), dt);
    }

    this.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(Math.pow(.07, dt));
    this.position.x = clamp(this.position.x, -34, 34);
    this.position.z = clamp(this.position.z, -34, 34);

    if (this.position.y > 0 || this.verticalVelocity > 0) {
      this.verticalVelocity -= 22 * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.startAction("stomp");
      }
    }

    if (this.action) {
      const data = ATTACKS[this.action.type];
      this.action.time += dt;
      if (!this.action.fired && this.action.time >= data.windup) {
        this.action.fired = true;
        combat.perform(this, this.action.type);
      }
      if (this.action.time >= data.windup + data.active + data.recovery) this.action = null;
    }

    let lean = 0;
    let lift = 0;
    let width = 1;
    let height = 1;
    let tilt = 0;
    if (this.action) {
      const data = ATTACKS[this.action.type];
      const windup = clamp(this.action.time / data.windup, 0, 1);
      const recoil = 1 - clamp((this.action.time - data.windup) / data.active, 0, 1);
      const phase = this.action.fired ? recoil : windup;
      if (this.action.type === "light") {
        lean = (this.action.fired ? .2 : -.14) * phase;
        height = 1 - .06 * phase;
      } else if (this.action.type === "heavy") {
        lean = (this.action.fired ? .34 : -.32) * phase;
        height = 1 - .18 * phase;
        width = 1 + .12 * phase;
      } else if (this.action.type === "special") {
        lift = .45 * phase;
        height = width = 1 + .15 * phase;
      } else if (this.action.type === "grab") {
        lean = -.2 * phase;
        width = 1 + .14 * phase;
      } else if (this.action.type === "throw") {
        lean = (this.action.fired ? .3 : -.25) * phase;
        tilt = .12 * phase;
      } else if (this.action.type === "roar") {
        height = 1 + .12 * phase;
        width = 1 + .18 * phase;
      } else if (this.action.type === "stomp") {
        height = 1 - .16 * phase;
        width = 1 + .12 * phase;
      }
    }
    this.visual.position.y = THREE.MathUtils.damp(this.visual.position.y, lift, 18, dt);
    this.visual.rotation.x = THREE.MathUtils.damp(this.visual.rotation.x, lean, 18, dt);
    this.visual.rotation.z = THREE.MathUtils.damp(this.visual.rotation.z, tilt, 18, dt);
    this.visual.scale.x = this.visual.scale.z = THREE.MathUtils.damp(this.visual.scale.x, width, 18, dt);
    this.visual.scale.y = THREE.MathUtils.damp(this.visual.scale.y, height, 18, dt);
    this.root.rotation.y = this.angle;
    arena.checkThrownCollision(this);
  }
}
