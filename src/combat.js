import * as THREE from "three";
import { ATTACKS, hitDamage } from "./simulation.js";

export class CombatSystem {
  constructor(fighters, arena, effects) {
    this.fighters = fighters;
    this.arena = arena;
    this.effects = effects;
  }

  opponent(actor) { return this.fighters.find(fighter => fighter !== actor); }

  perform(actor, type) {
    const target = this.opponent(actor);
    const attack = ATTACKS[type];
    const origin = actor.position.clone().setY(2.5);
    const direction = actor.forward();

    if (type === "roar") {
      this.effects.shockwave(actor.position, actor.stats.accent);
      this.effects.burst(origin, actor.stats.accent, 9, 3);
      return;
    }

    if (type === "throw") {
      const thrown = actor.releaseHeld(direction.clone().multiplyScalar(attack.knockback));
      if (thrown) {
        thrown.receiveHit(hitDamage(attack.damage, actor.combo, false, actor.stats.power), new THREE.Vector3(0, 4, 0), attack.stun, actor);
        this.effects.burst(thrown.position.clone().setY(3), actor.stats.accent, 12, 6);
        this.effects.shake(.65);
      }
      return;
    }

    if (type === "grab") {
      if (target.alive && !target.heldBy && actor.position.distanceTo(target.position) <= attack.reach) {
        actor.holding = target;
        target.heldBy = actor;
        target.action = null;
      }
      return;
    }

    const hitPosition = actor.position.clone().add(direction.clone().multiplyScalar(attack.reach * .7));
    this.arena.damageInRadius(hitPosition, type === "special" || type === "stomp" ? attack.reach : 2.8, attack.damage * (type === "heavy" ? 2.2 : 1.3));

    if (type === "special") {
      if (actor.kind === "raptor") this.effects.electric(origin.clone().setY(5), target.position.clone().setY(3.5));
      else this.effects.shockwave(actor.position, actor.stats.accent);
    } else if (type === "stomp") {
      this.effects.shockwave(actor.position, 0xd6b178);
      this.effects.dust(actor.position, 14);
    } else {
      this.effects.burst(hitPosition, actor.stats.accent, type === "heavy" ? 10 : 5, type === "heavy" ? 6 : 3);
    }

    const toTarget = target.position.clone().sub(actor.position);
    const distance = toTarget.length();
    const inArc = type === "stomp" || type === "special" || direction.dot(toTarget.clone().normalize()) > .05;
    if (!target.alive || distance > attack.reach + target.radius || !inArc) return;

    const facingAttacker = target.forward().dot(toTarget.clone().normalize().negate()) > .1;
    const blocked = target.blocking && facingAttacker;
    const damage = hitDamage(attack.damage, actor.combo, blocked, actor.stats.power);
    const knockback = toTarget.normalize().multiplyScalar(attack.knockback * (blocked ? .3 : 1));
    knockback.y = type === "heavy" || type === "special" ? 3.5 : 1.2;
    target.receiveHit(damage, knockback, attack.stun, actor, blocked);
    this.effects.shake(type === "light" ? .22 : .55);
    this.effects.burst(target.position.clone().setY(3), blocked ? 0xc6e7ff : actor.stats.accent, blocked ? 5 : 12, 5);
  }
}
