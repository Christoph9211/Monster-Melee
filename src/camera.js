import * as THREE from "three";

export class CameraController {
  constructor(camera, effects) {
    this.camera = camera;
    this.effects = effects;
    this.lookAt = new THREE.Vector3();
  }

  update(dt, player, enemy) {
    const midpoint = player.position.clone().lerp(enemy.position, .38).setY(2.8);
    const separation = player.position.distanceTo(enemy.position);
    const behind = player.forward().multiplyScalar(-Math.max(12, separation * .65));
    const desired = player.position.clone().add(behind).add(new THREE.Vector3(0, 8 + separation * .12, 0));
    const smoothing = 1 - Math.exp(-dt * 4);
    this.camera.position.lerp(desired, smoothing);
    this.lookAt.lerp(midpoint, 1 - Math.exp(-dt * 6));

    if (this.effects.shakeAmount > 0) {
      const amount = this.effects.shakeAmount;
      this.camera.position.add(new THREE.Vector3((Math.random() - .5) * amount, (Math.random() - .5) * amount, (Math.random() - .5) * amount));
    }
    this.camera.lookAt(this.lookAt);
  }
}
