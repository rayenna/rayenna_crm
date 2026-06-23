# Deprecated — unused

`shared/types.ts` was intended for types shared between a standalone PE backend and frontend.

The live app uses:

- Frontend types in `proposal-engine/frontend/src/lib/`
- Server types in `src/types/` (e.g. `roofLayoutGeometry.ts`)

Nothing in the repo imports `proposal-engine/shared/types.ts`. Safe to ignore or remove in a future cleanup.
