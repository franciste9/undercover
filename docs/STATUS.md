# Status

The pilot, built phase by phase from `docs/PLAN.md`.

## Built so far

- `backend/`: SQLite behind FastAPI, seeded from `data/`.
  - Reads: `list_claims`, `get_claim`, `get_policy` (with its plan's limits and add-ons), `get_customer`, `get_policy_wording`, `list_handlers`, `list_steps` and `health`.
  - A claim's life: `start_claim`, `add_step`, `decide_claim`, `stop_claim`, `sign_off_claim`, `pay_claim`. The stages are `waiting`, `in_progress`, `awaiting_signoff` and `decided`.
  - The rules: a payout over $1,000 waits for a handler's sign-off, a payment must equal the approved payout, and a claim pays once.
  - `get_instructions` serves `backend/instructions.md`, which is the agent's system prompt. `run_claim` starts the agent on a claim in the background.
- `agent/`: `run(claim_id, thread_id)` works a claim from reading it to deciding it, through the API alone. Six tools: `get_claim`, `get_policy`, `get_claim_history`, `get_policy_wording`, `decide_claim` and `pay_claim`. Each one records a step, so the dashboard can follow the run.
- `dashboard/`: still the one page that shows whether the backend is up.
- `e2e/`: one test of that page.

## Running it

- `npm run dev` starts the backend on 8000 and the dashboard on 5173.
- `uv run -m backend.seed` rebuilds `backend/undercover.db` from `data/`. The backend seeds itself when the file is missing. `UNDERCOVER_DB` points it somewhere else.
- `uv run -m agent.main CLM-1001` works one claim; with no claim id it works every waiting claim. `MODEL_NAME=openrouter/free` runs it on a free model.
- `npm run check` runs every check.
