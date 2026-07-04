# Monster Melee

An original third-person giant-monster arena brawler prototype. Two primitive-built fighters battle in a destructible city; no external character, model, music, logo, or game assets are used.

## Run

Requires Node.js 20.19+.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. For a production check:

```powershell
npm test
npm run build
```

## Controls

| Action | Key |
| --- | --- |
| Move / turn | W/S + A/D |
| Sprint | Shift |
| Jump / landing stomp | Space |
| Light / heavy attack | J / K |
| Grab / throw | G, then G again |
| Block | Hold B |
| Roar | R |
| Special | L |
| Pause | Escape |

Choose either Titan Brute or Volt Raptor from the main menu. The unselected fighter is controlled by the AI.

## Prototype scope

- Staged buildings: intact → damaged → collapsing → rubble
- Crushable cars and streetlights
- Hit stun, knockback, blocks, short combo scaling, grabs, throws, cooldown specials
- Follow camera, impact particles, dust, electricity, shockwaves, and screen shake

## Playtest readiness checklist

This prototype is now suitable for a first keyboard playtest when `npm test` and `npm run build` pass.

- Start from menu, pick either monster, and verify the other fighter becomes the AI rival.
- Fight for at least three rematches to confirm the arena resets without performance degradation.
- Stress-test city destruction with specials, throws, and stomps; debris and particles are capped to avoid runaway frame drops.
- Check readability: the follow camera should keep both fighters visible enough to judge spacing and attack timing.

## TODO

- Add gamepad input after keyboard combat timing is tuned.
- Add optional local multiplayer after one-camera combat proves readable.
- Replace primitives with original optimized GLB models if an art pass is funded.
- Add original audio, more arenas, and more fighters after the core match is playtested.
