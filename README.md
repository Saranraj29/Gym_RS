# FitTrack — gym member, fee & renewal manager

A complete gym management app: members (with **photos**), plans, fees & balances, renewals and
**WhatsApp reminders** — with a polished marketing home page that leads straight into the app.

| Layer    | Tech                                                    |
| -------- | ------------------------------------------------------- |
| Frontend | React 18 + Vite, React Router, Recharts, Lucide icons   |
| Backend  | FastAPI, SQLAlchemy 2, Pillow (photo processing)        |
| Database | **SQLite 3** — stored in the [`DB/`](DB) folder         |
| Runtime  | Docker image + docker compose (nginx serves the UI)     |

## Features

- **Home page** (`/`) — hero, features, how it works, dashboard preview, WhatsApp showcase, pricing, about, FAQ, "Book a demo" form. Only a **Get Started** button (no login) — it opens the app.
- **Dashboard** — active members, renewals due in 7 days, expired, pending fees, 6-month collection chart, members by plan.
- **Members** — search by name / phone / ID, filter by status & plan, sort, table **or photo-card view**, pagination.
- **Member photos** — upload, drag-and-drop, or take a photo with the phone camera. Photos are resized server-side and shown everywhere a member appears (lists, dashboard, reminders…).
- **Member detail** — plan progress, fee status, payment history with receipt numbers, edit details, renew plan, collect balance, change/remove photo.
- **Fees** — pending list sorted by balance, part-payments, cash / UPI / card / bank split.
- **WhatsApp reminders** — pick renewal-due / fee-pending / expired members, English or தமிழ் templates (editable), live preview, one-click send, history of what was sent and who paid afterwards.
- **Plans & settings** — edit plans and prices, gym details, reminder method. Light & dark theme.

> **Reminders are one-click, not automatic.** Each press opens WhatsApp (`wa.me`) with the message ready; you press send.
> Fully automatic sending needs a WhatsApp Business API provider and is **not** implemented (the option is shown as "Coming soon").

## Run with Docker (recommended)

```bash
cp .env.example .env        # optional — change port / demo data
docker compose up --build
```

Open **http://localhost:8080**. Stop with `Ctrl+C` (or `docker compose down`).

- Data lives in the repo's **`DB/`** folder (`gym.db` + `photos/`) — it survives rebuilds. **Back up = copy `DB/`.**
- First start loads ~46 **sample members** (fake `90000 000xx` numbers). Use `SEED_DEMO=false` in `.env` for an empty gym.
- On Linux, if the backend can't write to `DB/`, run it as your own user:
  ```bash
  PUID=$(id -u) PGID=$(id -g) docker compose up --build
  ```

Hot-reload development in containers: `docker compose -f docker-compose.dev.yml up --build`
(UI on :5173, API docs on :8000/docs).

## Run without Docker

```bash
# backend  (Python 3.11+)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000     # API docs: http://localhost:8000/docs

# frontend  (Node 20+) — in a second terminal
cd frontend
npm install
npm run dev                                   # http://localhost:5173  (proxies /api and /media to :8000)
```

## Tests & CI

```bash
cd backend  && python -m pytest -q       # API tests (temp DB, never touches DB/)
cd frontend && npm test && npm run build
```

GitHub Actions (`.github/workflows/ci.yml`) runs both, then builds the Docker images, starts the stack and smoke-tests it through nginx.

## Project layout

```
backend/app/     FastAPI app — models, routers, services, seed data
backend/tests/   pytest API tests
frontend/src/    React app — pages/ (landing + app), components/, styles/
frontend/public/ hero image & dashboard preview used by the home page
DB/              SQLite database + member photos (git-ignored)
```

## Configuration

| Variable      | Where     | Default                | Purpose                                   |
| ------------- | --------- | ---------------------- | ----------------------------------------- |
| `DB_DIR`      | backend   | `<repo>/DB` (`/data` in Docker) | Folder for `gym.db` and `photos/` |
| `SEED_DEMO`   | backend   | `true`                 | Load sample members on first start        |
| `CORS_ORIGINS`| backend   | `localhost:5173,8080`  | Allowed browser origins (dev only)        |
| `WEB_PORT`    | compose   | `8080`                 | Host port for the UI                      |
| `PUID`/`PGID` | compose   | `1000`                 | User the backend runs as                  |

## Customising the home page

All copy, stats, pricing tiers and contact details are in
[`frontend/src/landingContent.js`](frontend/src/landingContent.js). The numbers shown there (500+ gyms, pricing,
contact email…) are **sample placeholders** — replace them with your own before publishing.
Swap `frontend/public/images/hero.jpg` for a high-resolution photo of your choice.
