import { MathUtils, Vector3 } from "three";

const ACTION_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "KeyJ", "KeyK", "KeyG", "KeyB", "KeyR", "KeyL"]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    addEventListener("keydown", event => {
      if (ACTION_KEYS.has(event.code)) event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    addEventListener("keyup", event => this.down.delete(event.code));
    addEventListener("blur", () => this.down.clear());
  }

  held(...codes) { return codes.some(code => this.down.has(code)); }
  take(code) {
    const pressed = this.pressed.has(code);
    this.pressed.delete(code);
    return pressed;
  }
  flush() { this.pressed.clear(); }
}

export class PlayerController {
  constructor(actor, input) {
    this.actor = actor;
    this.input = input;
  }

  update() {
    const actor = this.actor;
    actor.intent.turn = Number(this.input.held("KeyA")) - Number(this.input.held("KeyD"));
    actor.intent.move = Number(this.input.held("KeyW")) - Number(this.input.held("KeyS"));
    actor.intent.sprint = this.input.held("ShiftLeft", "ShiftRight");
    actor.blocking = this.input.held("KeyB") && actor.canAct();

    if (this.input.take("Space")) actor.jump();
    if (this.input.take("KeyJ")) actor.startAction("light");
    if (this.input.take("KeyK")) actor.startAction("heavy");
    if (this.input.take("KeyG")) actor.startAction(actor.holding ? "throw" : "grab");
    if (this.input.take("KeyR")) actor.startAction("roar");
    if (this.input.take("KeyL")) actor.startAction("special");
  }
}

export class AIController {
  constructor(actor, target, arena) {
    this.actor = actor;
    this.target = target;
    this.arena = arena;
    this.decisionTime = 0;
    this.blockTime = 0;
    this.seed = 7;
  }

  random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  update(dt) {
    const actor = this.actor;
    if (!actor.alive || !this.target.alive) return;
    if (actor.holding) {
      actor.intent.move = actor.intent.turn = 0;
      this.decisionTime -= dt;
      if (this.decisionTime <= 0 && actor.canAct()) actor.startAction("throw");
      return;
    }

    const toTarget = new Vector3().subVectors(this.target.position, actor.position);
    const distance = toTarget.length();
    const desired = Math.atan2(toTarget.x, toTarget.z) + this.arena.avoidanceTurn(actor);
    actor.intent.turn = MathUtils.clamp(MathUtils.euclideanModulo(desired - actor.angle + Math.PI, Math.PI * 2) - Math.PI, -1, 1);
    actor.intent.move = distance > 4 ? 1 : 0;
    actor.intent.sprint = distance > 13;

    this.blockTime -= dt;
    actor.blocking = this.blockTime > 0 && actor.canAct();
    this.decisionTime -= dt;
    if (this.decisionTime > 0 || !actor.canAct()) return;
    this.decisionTime = .25 + this.random() * .35;

    if (this.target.action && this.random() < .22) {
      this.blockTime = .35 + this.random() * .5;
    } else if (distance < 3.8 && this.random() < .14) {
      actor.startAction("grab");
    } else if (distance < 5) {
      actor.startAction(this.random() < .62 ? "light" : "heavy");
    } else if (distance < 9 && actor.specialCooldown <= 0 && this.random() < .25) {
      actor.startAction("special");
    }
  }
}
