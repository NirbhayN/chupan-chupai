# HIDEOUT

A browser based 3D hide and seek game with a Colyseus authoritative room server. The first playable map is Secret Courtyard: a central fountain plaza ringed by a hedge maze, a shipping yard, an overgrown garden with tall grass, and a market alley with stalls and laundry lines (16 enterable hiding objects, 4 grass fields). The two procedural chibi avatars follow the supplied screenshots: oversized rounded heads, compact bodies, the boy's dark hair/red cap/yellow shirt, and the girl's light buns/white accessories.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Select **Try Solo Playground** on the home screen to test the 3D map, both avatars, movement, camera, jumping, crouching, hiding, and gems without joining a room or running the multiplayer server. Solo mode is a local test area and does not simulate other players.

Create a private room and send the invite link to other players. The host can start with 2–12 connected players; four players are recommended. Everyone who opens the link must be able to reach the same Colyseus server at port 2567.

For separate processes:

```bash
npm run dev:server
npm run dev:client
```

The default client endpoint is `ws://<website hostname>:2567`. Set `VITE_SERVER_URL` in a `.env` file for another server:

```
VITE_SERVER_URL=wss://game.example.com
PORT=2567
```

Vite reads `VITE_SERVER_URL` at build time. For deployment, run `npm run build`, host `dist/` on a static web server, and run `npm run start:server` on a Node host reachable by WebSocket. Put the server behind a TLS reverse proxy for `wss://` when the site uses HTTPS. A single server process holds room state in memory; multi instance scaling would require a shared Colyseus presence/driver.

## Controls

- WASD / arrows: move
- Mouse: rotate camera (click the world to capture pointer)
- Shift: sprint
- Space: jump
- C: crouch
- E: enter or exit hiding objects (one hider per object); seeker searches the nearest object (1.6 s cooldown after an empty search)
- C in tall grass: blend in — opponents can't see you unless they're within ~2.4 m
- Left click / F: seeker tag — a short lunge that catches the closest visible hider inside the red wedge in front of you (1.1 s cooldown, walls block it, anyone bumping into you counts)
- Q: seeker pulse (25 second cooldown, reports nearby hider count)
- Esc: pause menu

Touch screens have a direction pad and action buttons. The server checks movement, collisions, tags, roles, gems and round results. A room has a 25 second hide phase and a 180 second seek phase. Occupied hiding objects conceal hiders until they move, exit, or the seeker searches the object. Players can also hide naturally behind walls and cover: name tags and minimap dots of opponents only appear with a clear line of sight. Solo mode has a **Practice as seeker** toggle with 5 bot hiders for testing the tag.

## Project structure

- `src/world.ts`: shared map layout, collision, line of sight and tag rules (used by client, solo and server)
- `src/avatar.tsx`: reusable procedural 3D characters and movement animation
- `src/scene.tsx`: courtyard props, tall grass, characters, visibility rules, tag wedge and follow camera
- `src/minimap.tsx`: HUD minimap (only shows players you can actually see)
- `src/main.tsx`: React screens, HUD, controls and Colyseus client
- `src/solo.tsx`: local playground for testing without a room
- `server/index.ts`: room state, phase timer, movement validation, catches and wins

The attached images are references only; they are not displayed as game art. The avatars can later be replaced with original rigged .glb models without changing room state or gameplay rules.

## Current scope

Secret Courtyard, two character choices, private invites, real player synchronization, hiding/searching, gems, tag validation, seeker pulse, results and replay are implemented. Outfit customization, additional maps, music, sound effects, skeletal animation, and production persistence are future work. Jumping is visual and does not allow climbing obstacles.
