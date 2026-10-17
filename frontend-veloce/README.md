# frontend-veloce

Frontend del sistema de citas médicas, reescrito desde el viejo CRA (`../frontend`).

## Stack

- **Vite + React 19 + TypeScript**
- **TanStack Query** — estado de servidor (cache, dedupe, sin loops de requests)
- **Mantine 8** — componentes, tema (`src/shared/ui/theme.ts`), modo claro/oscuro,
  fechas en español y avisos
- **Leaflet + react-leaflet** — mapa de consultorios sobre OpenStreetMap, cargado
  solo cuando alguien pide la vista de mapa
- **react-router-dom v6** — rutas + guards (`src/shared/auth/guards.tsx`)
- **react-hook-form + zod** — formularios de auth
- **Cliente API tipado a mano** en `src/shared/api` (types + endpoints + fetch wrapper)

## Estructura

```
src/
  shared/api/        client.ts, endpoints.ts, types.ts
  shared/auth/       auth-context, token, guards
  shared/lib/        format (fechas + labels)
  shared/ui/         theme (colores, ESTADOS, avisos)
  components/common/ status-badge, states (loading/empty/error)
  components/layout/ app-layout
  features/          auth, dashboard, doctors, appointments, agenda, schedule,
                     profile, patients (tabs), admin, demo
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

## Decisiones

- **Sin Tailwind.** Mantine trae su propio sistema de estilos; mantener los dos
  significaba dos fuentes de verdad para los mismos colores y espacios.
- **Leaflet y no Google Maps.** No pide llave de API ni facturación, y una llave
  de Google viajaría en el JavaScript del navegador.
- **Tabla en escritorio, tarjetas en el teléfono.** Una tabla de cinco columnas
  a 390 px obliga a arrastrar de lado para alcanzar las acciones.

## Pendiente (mejora futura)

- Edición de entradas de historial/seguimientos (hoy solo alta + lectura).
- Vista previa de los adjuntos sin descargarlos.
- Reemplazar el cliente a mano por el generado de veloce-ts (`generate:client`)
  cuando se valide su salida.
