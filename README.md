# AI-Powered Restaurant Management System — Backend

FastAPI backend for the MVP: AI menu recommendations, reservation intent
recognition, and feedback sentiment analysis, backed by PostgreSQL and GROQ.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env:
#   - DATABASE_URL -> your PostgreSQL connection string
#   - GROQ_API_KEY  -> get one free at https://console.groq.com
#   - SECRET_KEY    -> any long random string
```

Create the database (if it doesn't exist yet):

```bash
createdb restaurant_ai
# or via psql:
psql -U postgres -c "CREATE DATABASE restaurant_ai;"
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

On first startup the app automatically:
- Creates all tables (MVP convenience — swap for Alembic migrations in production)
- Bootstraps a default admin account using `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` from `.env`

API docs: `http://localhost:8000/docs`

## Auth model

JWT bearer tokens, role-based (`customer` / `admin`).

1. `POST /api/auth/register` — customers self-register (always created as `customer` role)
2. `POST /api/auth/login` — returns `access_token`
3. Send `Authorization: Bearer <token>` on subsequent requests
4. Admin-only routes (menu writes, `/api/admin/*`, `/api/feedback/all`) require a user with `role: admin` — use the bootstrapped admin account, or promote a user directly in the database for a second admin.

## API Overview

| Module | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Menu (read: any user, write: admin) | `GET /api/menu`, `GET /api/menu/{id}`, `POST /api/menu`, `PUT /api/menu/{id}`, `PATCH /api/menu/{id}/price`, `PATCH /api/menu/{id}/rating`, `DELETE /api/menu/{id}` |
| AI Recommendation | `POST /api/recommendations` — `{"query": "recommend something spicy"}` |
| AI Reservation Assistant | `POST /api/reservations`, `GET /api/reservations/my` |
| AI Feedback Analysis | `POST /api/feedback`, `GET /api/feedback/my`, `GET /api/feedback/all` (admin) |
| Admin Dashboard | `GET /api/admin/users`, `GET /api/admin/stats` |

## Notes

- All AI endpoints require `GROQ_API_KEY` to be set; without it they return `503`.
- Reservation and feedback modules only extract/analyze — no real booking or storage side-effects beyond logging the interaction, matching MVP scope.
