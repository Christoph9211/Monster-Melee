import * as THREE from "three";
import { nextBuildingState } from "./simulation.js";

const box = new THREE.BoxGeometry(1, 1, 1);

export class Arena {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.buildings = [];
    this.props = [];
    this.debris = [];
    this.buildWorld();
  }

  mesh(color, position, scale, roughness = .85) {
    const mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color, roughness }));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildWorld() {
    this.mesh(0x293129, [0, -.55, 0], [80, 1, 80]);
    for (const offset of [-24, 0, 24]) {
      this.mesh(0x161c20, [offset, .01, 0], [7, .08, 80]);
      this.mesh(0x161c20, [0, .012, offset], [80, .08, 7]);
    }
    for (let mark = -36; mark <= 36; mark += 6) {
      for (const offset of [-24, 0, 24]) {
        this.mesh(0xc3a85c, [offset, .07, mark], [.16, .03, 2]);
        this.mesh(0xc3a85c, [mark, .071, offset], [2, .03, .16]);
      }
    }

    const blocks = [-15, -7.5, 7.5, 15];
    let index = 0;
    for (const x of blocks) {
      for (const z of blocks) {
        this.createBuilding(x, z, index++);
      }
    }

    for (const [x, z, rot] of [[-1.7, -19, 0], [1.7, 16, 0], [-18, 1.7, Math.PI / 2], [16, -1.7, Math.PI / 2]]) {
      this.createCar(x, z, rot);
    }
    for (const x of [-11, 11]) {
      for (const z of [-19, -11, 11, 19]) this.createStreetlight(x, z);
    }
  }

  createBuilding(x, z, index) {
    const width = 5.2 + (index % 3) * .7;
    const depth = 5.2 + ((index + 1) % 3) * .6;
    const height = 8 + (index * 7 % 9);
    this.mesh(0x777a74, [x, .15, z], [width + 1, .3, depth + 1]);

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.scene.add(group);
    const body = new THREE.Mesh(box, new THREE.MeshStandardMaterial({
      color: [0x4f6167, 0x655b58, 0x58645a][index % 3],
      roughness: .88,
    }));
    body.position.y = height / 2 + .3;
    body.scale.set(width, height, depth);
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x2c3334, roughness: 1 }));
    roof.position.y = height + .45;
    roof.scale.set(width + .35, .35, depth + .35);
    group.add(roof);

    const windows = new THREE.MeshStandardMaterial({ color: 0xb8d5c7, emissive: 0x2e473d, emissiveIntensity: .9 });
    for (let floor = 2; floor < height - 1; floor += 2.4) {
      const strip = new THREE.Mesh(box, windows);
      strip.position.set(0, floor, depth / 2 + .025);
      strip.scale.set(width * .72, .55, .06);
      group.add(strip);
    }
    this.buildings.push({ group, body, roof, position: group.position, width, depth, height, health: 100, state: "intact", collapseTime: 0 });
  }

  createCar(x, z, rotation) {
    const group = new THREE.Group();
    group.position.set(x, .4, z);
    group.rotation.y = rotation;
    const body = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: z > 0 ? 0xe34d3c : 0xe5b73b, roughness: .6, metalness: .2 }));
    body.scale.set(1.4, .45, 2.5);
    group.add(body);
    const cab = body.clone();
    cab.material = new THREE.MeshStandardMaterial({ color: 0x34444c, roughness: .25, metalness: .4 });
    cab.position.y = .48;
    cab.scale.set(.95, .5, 1.05);
    group.add(cab);
    this.scene.add(group);
    this.props.push({ group, position: group.position, radius: 1.5, crushed: false });
  }

  createStreetlight(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x242b2c, metalness: .7 }));
    pole.position.y = 1.6;
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.23, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffe29a, emissive: 0xffa82f, emissiveIntensity: 2 }));
    lamp.position.y = 3.2;
    group.add(lamp);
    this.scene.add(group);
    this.props.push({ group, position: group.position, radius: .5, crushed: false });
  }

  damageBuilding(building, amount) {
    if (building.state === "rubble" || building.state === "collapsing") return;
    building.health -= amount;
    const next = nextBuildingState(building.health);
    if (next === "damaged" && building.state === "intact") {
      building.state = next;
      building.body.material.color.multiplyScalar(.6);
      building.body.rotation.z = .025;
      this.effects.dust(building.position.clone().setY(building.height * .55), 8);
    }
    if (next === "collapsing") {
      building.state = next;
      building.collapseTime = .85;
      this.effects.shake(.85);
      this.effects.dust(building.position.clone().setY(building.height * .6), 22);
    }
  }

  damageInRadius(position, radius, amount) {
    for (const building of this.buildings) {
      if (building.state !== "rubble" && this.distanceToBuilding(position, building) < radius) this.damageBuilding(building, amount);
    }
    this.crushProps(position, radius);
  }

  distanceToBuilding(position, building) {
    const dx = Math.max(Math.abs(position.x - building.position.x) - building.width / 2, 0);
    const dz = Math.max(Math.abs(position.z - building.position.z) - building.depth / 2, 0);
    return Math.hypot(dx, dz);
  }

  monsterStep(monster, speed, dt) {
    for (const building of this.buildings) {
      if (building.state !== "rubble" && this.distanceToBuilding(monster.position, building) < monster.radius) {
        this.damageBuilding(building, speed * dt * (monster.kind === "brute" ? 12 : 8));
        this.effects.dust(monster.position.clone(), 2);
      }
    }
    this.crushProps(monster.position, monster.radius);
  }

  crushProps(position, radius) {
    for (const prop of this.props) {
      if (!prop.crushed && prop.position.distanceToSquared(position) < (radius + prop.radius) ** 2) {
        prop.crushed = true;
        prop.group.scale.y = .12;
        prop.group.position.y = .08;
        this.effects.burst(prop.position.clone().setY(.5), 0xf4ad42, 5, 2.5);
      }
    }
  }

  checkThrownCollision(monster) {
    if (monster.velocity.lengthSq() < 70) return;
    for (const building of this.buildings) {
      if (building.state !== "rubble" && this.distanceToBuilding(monster.position, building) < monster.radius) {
        this.damageBuilding(building, 45);
        monster.receiveHit(6, monster.velocity.clone().multiplyScalar(-.15), .3, null);
        monster.velocity.multiplyScalar(-.2);
        this.effects.shake(.65);
        this.effects.burst(monster.position.clone().setY(3), 0xffbd68, 14, 6);
        break;
      }
    }
  }

  avoidanceTurn(monster) {
    const ahead = monster.position.clone().add(monster.forward().multiplyScalar(5));
    let closest = null;
    let distance = Infinity;
    for (const building of this.buildings) {
      const next = this.distanceToBuilding(ahead, building);
      if (building.state !== "rubble" && next < distance) {
        closest = building;
        distance = next;
      }
    }
    if (!closest || distance > 2.5) return 0;
    return closest.position.x - monster.position.x > 0 ? -.7 : .7;
  }

  makeRubble(building) {
    building.state = "rubble";
    building.body.visible = building.roof.visible = false;
    for (let i = 0; i < 12; i++) {
      const chunk = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x55514c, roughness: 1 }));
      chunk.position.copy(building.position).add(new THREE.Vector3((Math.random() - .5) * building.width, .4 + Math.random() * 3, (Math.random() - .5) * building.depth));
      chunk.scale.set(.5 + Math.random() * 1.3, .35 + Math.random(), .5 + Math.random() * 1.3);
      chunk.rotation.set(Math.random(), Math.random(), Math.random());
      chunk.castShadow = chunk.receiveShadow = true;
      this.scene.add(chunk);
      this.debris.push({ mesh: chunk, velocity: new THREE.Vector3((Math.random() - .5) * 7, 3 + Math.random() * 6, (Math.random() - .5) * 7), resting: false });
    }
  }

  update(dt) {
    for (const building of this.buildings) {
      if (building.state !== "collapsing") continue;
      building.collapseTime -= dt;
      building.group.scale.y = Math.max(.06, building.collapseTime / .85);
      building.group.rotation.z += dt * .17;
      if (building.collapseTime <= 0) this.makeRubble(building);
    }
    for (const chunk of this.debris) {
      if (chunk.resting) continue;
      chunk.velocity.y -= 18 * dt;
      chunk.mesh.position.addScaledVector(chunk.velocity, dt);
      chunk.mesh.rotation.x += dt * 2;
      if (chunk.mesh.position.y <= chunk.mesh.scale.y / 2) {
        chunk.mesh.position.y = chunk.mesh.scale.y / 2;
        chunk.velocity.set(0, 0, 0);
        chunk.resting = true;
      }
    }
  }
}
