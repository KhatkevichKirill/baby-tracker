# QA And Security Review Notes

## Current Status

- Architecture, monorepo skeleton, Prisma model, API modules, Telegram/Web shells, LLM parser scaffold, analytics, files, deploy scripts and agent task pack are present.
- This is an implementation handoff baseline, not a production-ready MVP.

## High Priority Follow-ups

- Add real request authentication context and family-level guards to every API endpoint.
- Replace SHA-256 password hashing with `argon2` or `bcrypt` before real use.
- Replace Web placeholder with actual Next.js UI.
- Replace rule-based parser with real `LlmProvider`, keeping confirmation flow.
- Add real upload streaming/storage instead of attachment metadata only.
- Complete integration tests after package manager/dependency installation is working.

## Verification Blockers

- `pnpm` is not available directly on the VPS shell.
- `corepack prepare pnpm@10.11.0 --activate` and `npm --version` did not return a stable status in the current shell tool session, so dependency installation/build/test could not be verified here.

## Manual Review Result

- No secrets were added.
- Plan file was not edited.
- Agent instructions were created under `docs/agent-tasks`.
- LLM parser path still only creates drafts; final events are created through draft confirmation.
