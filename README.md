# imto Admin Dashboard

Internal admin tool for managing the imto-core-be microservices platform.

## Prerequisites

- Node.js 18+
- Backend services running (Go microservices + KrakenD gateway)

## Setup

```bash
cd frontend
cp .env.example .env
npm install
```

## Configuration

Edit `.env`:

```
# Recommended for local dev: keep empty and use Vite proxy `/api -> http://localhost:9080`
# VITE_API_URL=
VITE_APP_TITLE=imto Admin
```

Notes:
- Dev server already proxies `/api` in `vite.config.ts`, so same-origin requests avoid CORS issues.
- Only set `VITE_API_URL` when you intentionally bypass the Vite proxy (for example, pointing to a remote gateway).

## Development

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

## Features

- **Tenant Management**: Create, edit, delete academy tenants
- **User Management**: Create, edit, delete users with role assignment
- **Multi-tenant Support**: Switch between tenants via header dropdown
- **JWT Authentication**: Automatic token refresh
- **Role-based Views**: `system_admin`, `academy_admin`, `teacher`, `user`

## Tech Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query v5
- Axios with interceptors
- React Router v6
- Zod validation
- Sonner toasts
