# Repository Guidelines

## Project Structure & Module Organization

- `src/`: React + TypeScript frontend.
  - `src/components/`: UI (layout/chat/session/canvas/files/settings).
  - `src/stores/`: Zustand state (`*Store.ts`).
  - `src/lib/`: shared helpers + clients (e.g. gateway/tauri wrappers).
  - `src/types/`: shared TypeScript types.
- `src-tauri/`: Rust/Tauri backend (`src-tauri/src/` modules like `gateway/`, `sessions/`, `files/`, `plugins/`) and `src-tauri/tests/`.
- `docs/`: project docs; `public/`: static assets; `dist/`: frontend build output.

## Build, Test, and Development Commands

- Install deps (lockfile is `package-lock.json`): `npm ci`
- Frontend dev server: `npm run dev`
- Production frontend build: `npm run build` (runs `tsc` + `vite build`)
- Preview built frontend: `npm run preview`
- Full pre-push suite: `npm run check` (TS + ESLint + Vitest + Rust fmt/clippy/test)
- Frontend-only gate: `npm run check:frontend`
- Rust-only gate: `npm run check:backend`
- Install versioned git hooks (pre-commit + pre-push): `npm run hooks:install`
- Auto-fix via Codex CLI (when checks fail): `npm run codex:fix` (or `codex:fix:frontend`)

Rust-only (from repo root):

- Tests: `cd src-tauri && cargo test`
- Formatting: `cd src-tauri && cargo fmt -- --check`
- Lints: `cd src-tauri && cargo clippy --all-targets -- -D warnings`

## Coding Style & Naming Conventions

- Match existing style: 2-space indentation, single quotes, and functional React components + hooks.
- Naming: components `PascalCase.tsx`, hooks `useThing`, tests `*.test.ts(x)` under `__tests__/`.
- Keep dependencies flowing one-way: `src/types` -> `src/lib` -> `src/stores` -> `src/components` (avoid importing UI into lower layers).
- Auto-fix: `npm run fix` (ESLint --fix + `cargo fmt`)

## Testing Guidelines

- Frontend: Vitest + Testing Library (`jsdom`); run `npm test` / `npm run test:watch`.
- Coverage: `npm run test:coverage` enforces thresholds (see `vitest.config.ts`).
- Backend: add unit/integration tests under `src-tauri/src/**` (inline `mod tests`) or `src-tauri/tests/`.

## Commit & Pull Request Guidelines

- Use Conventional Commits (seen in history): `feat:`, `fix:`, `docs:`, `chore:`, `ci:` (optionally `feat(chat): ...`).
- PRs should include: what changed, how to test, linked issue(s), and screenshots/gifs for UI changes. Ensure `npm run check` is green before requesting review.

## Configuration & Secrets

- Put local config in `.env.local` (gitignored via `*.local`), e.g. `VITE_GATEWAY_URL=ws://127.0.0.1:18789`.
- Never commit tokens, logs, or build outputs (`dist/`, `src-tauri/target/` are ignored).
