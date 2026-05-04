![Lumen card](public/card.png)

**Lumen** is a pedestrian-first safety navigation app for Portugal's urban population. Instead of optimising for speed alone, Lumen scores every route using a **Safety Score** built on three independent data layers: official crime statistics (RASI/INE), street lighting infrastructure, and real-time community reports. Features include Safety Clusters (aggregate presence of nearby users) and Safe Places (one-tap access to the nearest police stations, 24h pharmacies, and hospitals).

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, PostgreSQL |
| Maps | Mapbox GL |
| Auth | NextAuth.js + JWT |

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/your-org/lumen.git
cd lumen
```

---

### 2. Environment variables

#### Frontend — `frontend/.env.local`

Create a `.env.local` file inside the `frontend/` folder:

```env
NEXTAUTH_SECRET=your_nextauth_secret
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Secret used to sign NextAuth session tokens |
| `NEXT_PUBLIC_BACKEND_URL` | URL of the FastAPI backend |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token for map rendering |

#### Backend — `.env`

Create a `.env` file in the project root:

```env
JWT_SECRET_KEY=your_jwt_secret
AUTH_URL=http://localhost:3000/api/auth
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lumen
NEXT_PUBLIC_LUMEN_API_URL=http://localhost:3000/
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

| Variable | Description |
|---|---|
| `JWT_SECRET_KEY` | Secret used to sign JWT tokens |
| `AUTH_URL` | NextAuth callback URL |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_LUMEN_API_URL` | Public URL of the frontend app |
| `FRONTEND_ORIGINS` | Comma-separated list of allowed CORS origins |

---

### 3. Start the database
 
```bash
docker compose up db -d
```
 
---
 
### 4. Run the frontend

```bash
mise i
cd frontend
bun install
bun dev
```

The frontend will be available at `http://localhost:3000`.

---

### 5. Run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        
pip install -r requirements.txt
```

Then, from the **project root**, start the server:

```bash
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
