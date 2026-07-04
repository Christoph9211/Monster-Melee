import assert from "node:assert/strict";
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

console.log("combat and destruction checks passed");
