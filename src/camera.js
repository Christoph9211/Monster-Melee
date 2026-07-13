import * as THREE from "three";

export class CameraController {
  constructor(camera, effects, motionScale = 1) {
    this.camera = camera;
    this.effects = effects;
    this.motionScale = motionScale;
    this.basePosition = camera.position.clone();
    this.lookAt = new THREE.Vector3();
    this.shakePhase = 0;
  }

  update(dt, player, enemy) {
    const midpoint = player.position.clone().lerp(enemy.position, .38).setY(2.8);
    const separation = player.position.distanceTo(enemy.position);
    const behind = player.forward().multiplyScalar(-Math.max(12, separation * .65));
    const desired = player.position.clone().add(behind).add(new THREE.Vector3(0, 8 + separation * .12, 0));
    const smoothing = 1 - Math.exp(-dt * 4);
    this.basePosition.lerp(desired, smoothing);
    this.lookAt.lerp(midpoint, 1 - Math.exp(-dt * 6));
    this.camera.position.copy(this.basePosition);

    if (this.effects.shakeAmount > 0) {
      const amount = this.effects.shakeAmount * this.motionScale;
      const direction = this.effects.shakeDirection;
      const side = new THREE.Vector3(-direction.z, .2, direction.x).normalize();
      this.shakePhase += dt * 70;
      this.camera.position
        .addScaledVector(direction, Math.sin(this.shakePhase) * amount)
        .addScaledVector(side, Math.cos(this.shakePhase * 1.37) * amount * .35);
    }
    this.camera.lookAt(this.lookAt);
  }
}
