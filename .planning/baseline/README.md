# Baseline capture

Captured **2026-04-29** after `npm run verify` exited successfully.

## Verification record

| Field | Value |
|-------|--------|
| Commit SHA | `670c71241a5152eb3fb12e9855ac3e9db16fcb84` |
| Command | `npm run verify` |
| Exit code | `0` |

## Rollback ref

Immutable rollback pointer: annotated git tag **`pre-astro-migration-baseline`** at the SHA above.

## Prerequisites resolved during capture

Playwright browsers were not initially installed locally (`npx playwright install chromium` was required) before smoke tests could run. Document here so CI/agents repeat that prerequisite after fresh installs.
