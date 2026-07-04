export const ATTACKS = {
  light: { windup: .12, active: .11, recovery: .22, damage: 8, reach: 4.2, knockback: 7, stun: .18 },
  heavy: { windup: .38, active: .16, recovery: .48, damage: 17, reach: 4.8, knockback: 13, stun: .45 },
  special: { windup: .52, active: .18, recovery: .65, damage: 22, reach: 8, knockback: 16, stun: .55 },
  stomp: { windup: .05, active: .22, recovery: .38, damage: 13, reach: 5.5, knockback: 11, stun: .35 },
  grab: { windup: .18, active: .18, recovery: .3, damage: 0, reach: 3.7, knockback: 0, stun: 0 },
  throw: { windup: .12, active: .12, recovery: .5, damage: 12, reach: 2, knockback: 22, stun: .7 },
  roar: { windup: .18, active: .25, recovery: .35, damage: 0, reach: 0, knockback: 0, stun: 0 },
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function hitDamage(base, combo, blocked, power = 1) {
  return Math.round(base * power * (1 + Math.min(combo, 2) * .12) * (blocked ? .3 : 1));
}

export function nextBuildingState(health, maxHealth = 100) {
  if (health <= 0) return "collapsing";
  if (health <= maxHealth * .65) return "damaged";
  return "intact";
}
