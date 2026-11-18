# Status

The pilot is built: the six phases of `docs/PLAN.md` are done and every box in it is ticked.

## What the pilot is

UnderCover's claims queue, worked by the UnderCover Agent and watched by the team.

- `backend/`: FastAPI over SQLite, seeded from `data/`. It holds the claims and it is the only place the rules live.
- `agent/`: the UnderCover Agent. It reads a claim, the policy, the customer's claim history and the policy wording, then approves, declines or refers the claim with a payout, a reason and the section it applied. It reaches all of that through the backend's API, never a file and never the database.
- `dashboard/`: React and Vite. The queue, a claim in full with the agent's steps as they happen, the sign-off and the payment, and the agent's instructions read only.
- `e2e/`: Playwright, driving the real screens on their own ports and their own database.

## The rules the backend enforces

- A payout over $1,000.00 leaves the claim `awaiting_signoff`. The payment is refused until a handler signs off, even when the agent tries to pay it itself.
- A payment must equal the approved payout, to the cent.
- Only an approved claim is paid, and a claim is paid once.

A claim is `waiting`, then `in_progress`, then `decided` or `awaiting_signoff`. A run that fails puts the claim back in `waiting` with a step that says the run stopped.

## The API

| Operation | Route |
|---|---|
| `health` | `GET /api/health` |
| `list_claims` | `GET /api/claims` |
| `get_claim` | `GET /api/claims/{claim_id}` |
| `list_steps` | `GET /api/claims/{claim_id}/steps` |
| `get_policy` | `GET /api/policies/{policy_id}` |
| `get_customer` | `GET /api/customers/{customer_id}` |
| `get_policy_wording` | `GET /api/policy-wording` |
| `get_instructions` | `GET /api/instructions` |
| `list_handlers` | `GET /api/handlers` |
| `start_claim` | `POST /api/claims/{claim_id}/start` |
| `add_step` | `POST /api/claims/{claim_id}/steps` |
| `decide_claim` | `POST /api/claims/{claim_id}/decision` |
| `stop_claim` | `POST /api/claims/{claim_id}/stop` |
| `sign_off_claim` | `POST /api/claims/{claim_id}/sign-off` |
| `pay_claim` | `POST /api/claims/{claim_id}/payment` |
| `run_claim` | `POST /api/claims/{claim_id}/run` |

A refused call returns 409 with a plain sentence saying which rule stopped it. `http://localhost:8000/docs` lists them all.

## Running it

- `npm run dev` starts the backend on 8000 and the dashboard on 5173.
- `uv run -m backend.seed` rebuilds `backend/undercover.db` from `data/`, which is how to reset the queue after a demo. The backend seeds itself when the file is missing, and `UNDERCOVER_DB` points it somewhere else.
- `uv run -m agent.main CLM-1001` works one claim and prints the agent's reply. Several claim ids work one after another; with no claim id the agent works every claim still waiting. `MODEL_NAME=openrouter/free uv run -m agent.main CLM-1023` runs it on a free model instead of `openai/gpt-6-luna`.
- "Run agent" on a waiting claim in the queue does the same from the browser: the backend runs the agent in the background and the steps appear on the claim page while it works.
- To change the agent, edit `backend/instructions.md`. It is the agent's system prompt, and the dashboard shows it on `#/instructions`.

## The checks

`npm run check` runs all of them: ruff, pyright and pytest for Python, then prettier, eslint, tsc and vitest for TypeScript, then Playwright end to end. The tests never call a model, and the end-to-end run has its own ports and its own database, so it leaves the demo queue alone.
