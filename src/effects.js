import * as THREE from "three";

const MAX_PARTICLES = 180;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.transients = [];
    this.hitStop = 0;
    this.shakeAmount = 0;
    this.shakeDirection = new THREE.Vector3(1, .25, 0).normalize();
    this.geometry = new THREE.OctahedronGeometry(.18, 0);
    this.geometry.userData.keepAlive = true;
    this.materials = new Map();
  }

  material(color) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshBasicMaterial({ color }));
    return this.materials.get(color);
  }

  trimParticles(incoming = 0) {
    while (this.particles.length + incoming > MAX_PARTICLES) {
      const stale = this.particles.shift();
      this.scene.remove(stale.mesh);
    }
  }

  burst(position, color = 0xff7a35, count = 8, force = 5) {
    const spawnCount = Math.min(count, MAX_PARTICLES);
    this.trimParticles(spawnCount);
    for (let i = 0; i < spawnCount; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material(color));
      mesh.position.copy(position);
      mesh.scale.setScalar(.6 + Math.random() * 1.5);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - .5) * force, Math.random() * force, (Math.random() - .5) * force),
        life: .35 + Math.random() * .45,
      });
    }
  }

  dust(position, count = 5) {
    this.burst(position, 0xa99578, count, 2.8);
  }

  shockwave(position, color = 0xff7a35) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.15, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide }),
    );
    mesh.position.copy(position);
    mesh.position.y = .08;
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    this.transients.push({ mesh, life: .45, maxLife: .45, grow: 11 });
  }

  electric(start, end) {
    const points = [];
    for (let i = 0; i <= 7; i++) {
      const point = start.clone().lerp(end, i / 7);
      if (i && i < 7) point.add(new THREE.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * .8, (Math.random() - .5) * .8));
      points.push(point);
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x72e8ff, transparent: true, opacity: 1 }),
    );
    this.scene.add(line);
    this.transients.push({ mesh: line, life: .16, maxLife: .16, grow: 0 });
  }

  requestHitStop(duration) { this.hitStop = Math.max(this.hitStop, duration); }

  consumeHitStop(dt) {
    const stopped = this.hitStop > 0;
    this.hitStop = Math.max(0, this.hitStop - dt);
    return stopped;
  }

  shake(amount, direction = null) {
    if (direction?.lengthSq() && amount >= this.shakeAmount) this.shakeDirection.copy(direction).normalize();
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  update(dt) {
    this.shakeAmount = THREE.MathUtils.damp(this.shakeAmount, 0, 12, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      particle.velocity.y -= 10 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 2));
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.transients.length - 1; i >= 0; i--) {
      const effect = this.transients[i];
      effect.life -= dt;
      effect.mesh.scale.setScalar(1 + effect.grow * (1 - effect.life / effect.maxLife));
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        this.transients.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const particle of this.particles) this.scene.remove(particle.mesh);
    this.particles.length = 0;
    for (const effect of this.transients) {
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
    }
    this.transients.length = 0;
    this.geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}
