# Memory Palace — Agent Handoff Summary

Context summary of a prior agent session, for continuing work on this project.

## Project

**Memory Palace** — a personal game project at
`/Users/dixonkavanaugh/Work/Personal/memory-palace` (its own git repo; separate
from the user's Trove work repo). It trains the *method of loci* (per
*Moonwalking with Einstein*): the player assigns a vivid personal image to each
of the 52 playing cards, shuffles a deck, mentally places each card's image at
successive stops along a familiar route, then recalls the deck order by
"walking" the route.

The full design document is in `PLAN.md` (read it first). Key agreed decisions:

- **3D walkthrough** (react-three-fiber), **camera on rails** (no free roam).
- **One fixed outdoor landscape** — winding path over low-poly hills, 52
  waypoints each marked by a distinct landmark. **Deterministic/seeded — the
  world must be identical on every run.** Only the placed images change per
  shuffle. This invariant is the point of the technique; don't break it.
- Deck sizes 10 / 26 / 52 (difficulty = how far down the same route).
- Photos are user-uploaded, center-cropped square, downscaled to 512px JPEG.
- **Local-first, no backend/auth**: photos + card assignments in IndexedDB
  (`idb-keyval`, keys `photo:<CARDID>`, values `{ name, blob }`); run history
  in localStorage (`mp:history`); shuffle order persisted to sessionStorage
  (`mp:game` via zustand persist).
- Game mode: walk the route in order, 4 multiple choices per stop. **Easy =
  pick the image, Hard = pick the card.** Scored on accuracy + time; history
  with best runs per deckSize+mode shown on home page.

## Stack & commands

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4,
three + @react-three/fiber + @react-three/drei, zustand, idb-keyval.

- `npm run dev` (dev server, usually already running on :3000)
- `npm run build`, `npm run lint` — both pass clean as of handoff.

## Code map

- `lib/cards.ts` — 52-card model. Card ids like `"QH"`, `"10D"`, `"AC"`.
- `lib/rng.ts` — mulberry32 seeded PRNG, shuffle, sample.
- `lib/palace.ts` — deterministic terrain height fn, winding path `pathXZ(t)`,
  `WAYPOINTS` (52 precomputed: landmark type/pos, billboard pos, camera pose).
  13 landmark types cycle ×4. Seeds are fixed constants — do not randomize.
- `lib/storage.ts` — IndexedDB assignment CRUD, `processPhoto` (square-crop +
  downscale), localStorage run history (cached for useSyncExternalStore).
- `store/gameStore.ts` — zustand: assignments (hydrated to object URLs),
  shuffle order, walk index, quiz state/answers; persists order to
  sessionStorage.
- `components/palace/` — `PalaceScene` (Canvas, terrain, path line, scatter
  trees), `Landmarks` (13 primitive-built types), `PhotoBillboard` (framed
  billboard, "?" placeholder in quiz), `CameraRig` (damped lerp between
  waypoint poses), `Hud` (Timer, pills, `formatMs`).
- `components/deck/DeckSetup.tsx` — 52-slot grid + upload/name/remove modal.
- `components/game/QuizOverlay.tsx` — seeded 4-choice builder + feedback +
  auto-advance.
- Pages: `/` (home: deck status, size picker, history), `/deck`, `/palace`
  (memorize walk), `/game` (mode picker → quiz → results).

## State of the data (user's browser, localhost:3000)

31/52 cards assigned in IndexedDB right now:

- **Diamonds (all 13)** — generated caricature images of athletes, loaded with
  names: A=Tiger Woods, 2=Conor McGregor, 3=Kelly Slater, 4=Muhammad Ali,
  5=David Goggins, 6=Tom Brady, 7=Keenan Cornelius, 8=Kobe Bryant,
  9=Barry Bonds, 10=Laird Hamilton, J=Ross Edgley, Q=Ronda Rousey,
  K=Michael Jordan.
- **Clubs (6 of 13)** — A=Goku, 2=Vegeta, 3=Gohan, 8=Aang, 9=Sokka, Q=Katara.
- **Hearts (12)** — throwaway "Test XH" colored-square placeholders seeded
  during testing (A–Q; K unassigned). The user intends to replace these with
  real photos of friends/family (their list: A=Gabe Wahl, 2=Connor McCormick,
  3=Morgan, 4=Reilly, 5=Louis, 6=Gran, 7=Grammy, 8=Professor Grant,
  9=Jackson Rez, 10=Uncle Clay, J=Louie, Q=Mom, K=Dad).
- **Spades** — unassigned, no theme chosen yet.

Source PNGs for the 19 generated images live in `public/deck-images/`
(e.g. `AD-tiger-woods.png`), listed in `public/deck-images/manifest.json`.

## Agent workflow: adding card images

Two supported chat-driven methods (both end in the same pipeline):

1. **Generated**: user gives a card + short description → agent generates the
   image, saves it as `public/deck-images/<CARDID>-<slug>.png`.
2. **User file**: user gives a card + an image file (chat attachment or a
   path) → agent copies it into `public/deck-images/<CARDID>-<slug>.<ext>`.

Then, in both cases: add `{ "card": "<CARDID>", "file": "<filename>",
"name": "<display name>" }` to `manifest.json`, open
`http://localhost:3000/deck/import` in the browser, and click
**Import missing** (or **Re-import all** to overwrite an existing
assignment). The page square-crops/downscales exactly like a manual upload
(`lib/deckImport.ts`) and writes to IndexedDB. Buttons have
`data-testid="import-missing"` / `"import-all"`; per-row status and a
`data-testid="import-summary"` line report results.

## Blocked / open items

1. **7 clubs images could not be generated**: Bugs Bunny, Goofy, Hulk, Thor,
   Batman, Deadpool, Superman. The image-generation tool blocked
   WB/Disney/Marvel/DC characters on every attempt (~3 tries each, including
   fully genericized descriptions). Decision: user uploads official art
   manually via `/deck`, or a future agent retries with very different visual
   concepts. Don't burn many retries — the filter was a hard wall.
2. **Hearts** need real photos uploaded by the user (agent can't know faces).
3. **Spades** theme undecided.
4. Minor known quirk: in easy-mode quiz, choice thumbnails show photo names,
   which can hint the answer for descriptive names. User was offered
   name-hiding as an option; not implemented.

## Testing notes

Full loop verified in browser (deck setup → shuffle → 3D walk → easy quiz →
results → history). To seed/inspect app data from automation, use CDP
`Runtime.evaluate` in the page: IndexedDB db `keyval-store`, store `keyval`;
shuffle order readable at
`JSON.parse(sessionStorage.getItem("mp:game")).state.order`.

## Out of scope for v1 (per PLAN.md)

Accounts/hosted storage, multiple environments, free-roam movement,
leaderboards, spaced-repetition drills.
