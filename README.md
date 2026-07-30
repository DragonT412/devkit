# DevKit - API Debugger

A lightweight, full-stack API debugging tool built with Python FastAPI and vanilla web technologies. Clone and run — zero npm dependency, one `pip install`.

![DevKit Screenshot](screenshot.png)

## Features

- **HTTP request builder** — method selector (GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS), URL bar, headers editor, query params, and request body
- **CORS-free proxy** — backend forwards all requests, so you never hit cross-origin issues
- **Response viewer** — status code badge, timing, size, formatted response headers, and JSON syntax-highlighted body
- **Request history** — every proxied request auto-saved to SQLite; click to replay, delete individually or clear all
- **Collections** — organize saved requests into named folders, similar to Postman collections
- **Dark theme** — designed for long debugging sessions with a clean, utility-focused dark UI

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.10+, FastAPI, httpx, aiosqlite |
| Frontend | Vanilla HTML/CSS/JS — no framework, no build step |
| Database | SQLite (auto-created on first run) |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USER/devkit.git
cd devkit

# 2. Install
pip install -r requirements.txt

# 3. Run
uvicorn backend.main:app --reload --port 8000

# 4. Open
# http://localhost:8000
```

## Architecture

```
devkit/
├── backend/
│   ├── main.py              # FastAPI app entry, CORS, static file mount
│   ├── database.py           # SQLite connection + schema init
│   ├── models.py             # Pydantic request/response models
│   └── routers/
│       ├── proxy.py          # POST /api/proxy — forwards HTTP requests
│       └── collections.py    # CRUD /api/collections + /api/collections/{id}/requests
├── frontend/
│   ├── index.html            # SPA layout
│   ├── css/
│   │   └── style.css         # Dark theme stylesheet
│   └── js/
│       └── app.js            # Full client logic: request builder, history, collections
├── requirements.txt
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/proxy` | Proxy an HTTP request to any URL |
| GET | `/api/history` | List recent requests |
| DELETE | `/api/history` | Clear all history |
| DELETE | `/api/history/{id}` | Delete one history item |
| GET | `/api/collections` | List all collections |
| POST | `/api/collections` | Create a collection |
| PUT | `/api/collections/{id}` | Rename a collection |
| DELETE | `/api/collections/{id}` | Delete a collection |
| GET | `/api/collections/{id}/requests` | List requests in a collection |
| POST | `/api/collections/{id}/requests` | Add a request to a collection |
| PUT | `/api/collections/{id}/requests/{rid}` | Update a collection request |
| DELETE | `/api/collections/{id}/requests/{rid}` | Remove a request from a collection |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Send request |

## License

MIT
