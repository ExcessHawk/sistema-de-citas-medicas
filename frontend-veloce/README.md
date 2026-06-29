# frontend-veloce

Frontend del sistema de citas médicas, reescrito desde el viejo CRA (`../frontend`).

## Stack

- **Vite + React 19 + TypeScript**
- **TanStack Query** — estado de servidor (cache, dedupe, sin loops de requests)
- **shadcn/ui** (Base UI + Tailwind v4) — componentes en `src/components/ui`
- **react-router-dom v6** — rutas + guards (`src/shared/auth/guards.tsx`)
- **react-hook-form + zod** — formularios de auth
- **Cliente API tipado a mano** en `src/shared/api` (types + endpoints + fetch wrapper)

## Estructura

```
src/
  shared/api/        client.ts, endpoints.ts, types.ts
  shared/auth/       auth-context, token, guards
  shared/lib/        format (fechas + labels)
  components/ui/     shadcn (Base UI)
  components/common/ status-badge, states (loading/empty/error)
  components/layout/ navbar, app-layout
  features/          auth, dashboard, doctors, appointments, profile, patients, admin
  pages/             home, not-found
```

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000 (proxy /api -> :5000)
npm run build    # tsc -b && vite build
```

Requiere el backend (`../backend-veloce`) corriendo en `:5000`. La auth guarda
`token`/`user` en localStorage; el cliente adjunta `Authorization: Bearer` y
redirige a `/login` ante un 401.

## Pendiente (mejora futura)

- Edición de entradas de historial/seguimientos (hoy solo alta + lectura).
- Reemplazar el cliente a mano por el generado de veloce-ts (`generate:client`)
  cuando se valide su salida.
