# Status

The pilot, built phase by phase from `docs/PLAN.md`.

## Built so far

- `backend/`: SQLite behind FastAPI, seeded from `data/`. The read operations: `list_claims`, `get_claim`, `get_policy` (with its plan's limits and add-ons), `get_customer`, `get_policy_wording`, `list_handlers` and `health`.
- `agent/`: still the skeleton, `run(claim_id, thread_id)` with one tool.
- `dashboard/`: still the one page that shows whether the backend is up.
- `e2e/`: one test of that page.

## Running it

- `npm run dev` starts the backend on 8000 and the dashboard on 5173.
- `uv run -m backend.seed` rebuilds `backend/undercover.db` from `data/`. The backend seeds itself when the file is missing. `UNDERCOVER_DB` points it somewhere else.
- `npm run check` runs every check.
