# Memory Palace — Design & Build Plan

A game that teaches and trains the **method of loci** (the "memory palace"
technique from *Moonwalking with Einstein*) for memorizing the order of a
shuffled deck of playing cards.

## The technique

Spatial memory is far stronger than abstract memory. A memory athlete
pre-memorizes two things:

1. **A fixed route** through a familiar space with distinct stops ("loci").
2. **A fixed, vivid image for each of the 52 cards** (Queen of Hearts = Mom,
   King of Diamonds = Michael Jordan, ...).

Memorizing a shuffled deck then becomes: walk the route in your mind's eye and
place each card's image at each successive stop. To recall the deck, walk the
route again and "see" the images.

**Key design consequence:** the landscape and route must be *identical on every
playthrough*. Familiarity with the space is the engine of the technique. Only
the images placed at each stop change per shuffle.

## Game design (v1)

### Deck setup (the user's card images)

- The user uploads photos, gives each a name, and **explicitly assigns each to
  a chosen card** (matching the real technique — the pairing is personal).
- Photos are center-cropped square and downscaled (max 512px JPEG) at upload
  time to keep storage lean and 3D textures fast.
- **Local-first:** photos + assignments live in IndexedDB; run history and
  settings in localStorage. No accounts or backend in v1.

### The palace

- One fixed **3D outdoor landscape**: a winding path through low-poly rolling
  hills, rendered with react-three-fiber. Deterministic (seeded) generation —
  the world is byte-for-byte the same every visit.
- **52 waypoints** along the path, each marked by a distinct landmark (oak,
  standing stone, campfire, pond, cabin, well, arch, obelisk, windmill, ...)
  so every locus is visually memorable.
- Difficulty = deck size: **10, 26, or 52 cards** — smaller decks just use the
  first N waypoints of the same route.

### Memorization walk

- Shuffle button randomizes the (assigned) deck; images are placed at
  waypoints in shuffled order.
- **Camera on rails:** click / arrow keys glide the camera stop-to-stop along
  the route. No free roam.
- At each stop the photo appears as a **framed billboard** facing the camera.
  The HUD shows: the actual playing card (e.g. Q♥), the photo's name, a
  position counter ("7 / 26"), and a running timer.
- Walk back and forth freely; reshuffle any time (replaces all placements).

### Game mode

- Walk the same route in order. At each waypoint the billboard shows "?" and
  the player picks from **4 choices**:
  - **Easy mode:** choose the correct *image*.
  - **Hard mode:** choose the correct *card* (tests the full card→image→locus
    chain).
- Wrong answers reveal the correct one; billboard reveals the photo after each
  answer, then auto-advances.
- **Scoring: accuracy + total time.** Runs are saved to history so the player
  can chase their best. Speed is the long-term game.

## Architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind v4. All game pages are
client components (3D + browser storage).

| Layer | Choice |
| --- | --- |
| 3D | `three` + `@react-three/fiber` + `@react-three/drei` |
| State | `zustand` (order/deck-size persisted to sessionStorage) |
| Photo storage | IndexedDB via `idb-keyval` |
| Run history | localStorage |

### File map

```
lib/
  cards.ts        52-card deck model, labels, suit colors
  rng.ts          seeded RNG (mulberry32) + Fisher-Yates shuffle
  palace.ts       deterministic path, terrain height fn, 52 waypoints
                  (landmark type + positions for landmark/billboard/camera)
  storage.ts      IndexedDB assignments, image downscale, run history
store/
  gameStore.ts    assignments cache, shuffle order, walk index, quiz state
components/
  CardChip.tsx    mini playing-card renderer
  deck/DeckSetup.tsx
  palace/PalaceScene.tsx   Canvas, sky, fog, lights, terrain, path line
  palace/Landmarks.tsx     13 landmark types × seeded variation
  palace/PhotoBillboard.tsx
  palace/CameraRig.tsx     damped camera tween between waypoint poses
  palace/Hud.tsx           counter, timer, card display, nav controls
  game/QuizOverlay.tsx     4-choice panel, feedback, results
app/
  page.tsx        home: deck status, start walk (size select), history
  deck/page.tsx   deck setup
  palace/page.tsx memorization walk
  game/page.tsx   game mode (easy/hard select → quiz → results)
```

### Build order

1. Core libs (cards, rng, palace geometry, storage) + store
2. Deck setup page
3. 3D scene + memorization walk
4. Game mode + scoring + history
5. Home page, polish, build verification

## Later (out of scope for v1)

- Real accounts + hosted image storage (sync across devices)
- Multiple environments / custom route editors
- Free-roam movement option
- Leaderboards; spaced-repetition drills for the card→image pairings
