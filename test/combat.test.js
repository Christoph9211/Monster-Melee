import assert from "node:assert/strict";
import { hitDamage, nextBuildingState } from "../src/simulation.js";

assert.equal(hitDamage(10, 0, false), 10);
assert.equal(hitDamage(10, 2, false), 12);
assert.equal(hitDamage(10, 0, true), 3);
assert.equal(nextBuildingState(100), "intact");
assert.equal(nextBuildingState(60), "damaged");
assert.equal(nextBuildingState(0), "collapsing");

console.log("combat and destruction checks passed");
