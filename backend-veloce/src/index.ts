/**
 * @file Bootstrap entrypoint for the medical appointments backend (Veloce-TS).
 *
 * EN: Wires the app: plugins (OpenAPI/Auth/RBAC), global rate limit, Drizzle DI,
 *     controllers and singleton services (Auth/Email). `AuthPlugin` populates
 *     `auth.user` from a Bearer JWT on every request; `@Roles(...)` gates each
 *     route. The token-signing `JWTProvider` is reused from `AuthPlugin` so
 *     issued tokens validate against the same secret. Calls `app.compile()`
 *     before `listen()` so the DI-driven router is ready.
 * ES: Cablea la app: plugins (OpenAPI/Auth/RBAC), rate limit global, DI de
 *     Drizzle, controllers y servicios singleton (Auth/Email). `AuthPlugin`
 *     rellena `auth.user` desde el JWT Bearer en cada request; `@Roles(...)`
 *     protege cada ruta. El `JWTProvider` que firma tokens se reutiliza de
 *     `AuthPlugin` para validar contra el mismo secret. Invoca `app.compile()`
 *     antes de `listen()`.
 */
import 'reflect-metadata';
import 'dotenv/config';
import {
  Veloce,
  OpenAPIPlugin,
  AuthPlugin,
  RBACPlugin,
  registerDrizzle,
  JWTProvider,
} from 'veloce-ts';
import { db } from './db/client';
import { customUserProvider } from './auth/user-provider';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { DOCUMENT_MAX_BYTES, createStorageProvider } from './services/storage.service';
import { AuthController } from './controllers/auth.controller';
import { DoctorsController } from './controllers/doctors.controller';
import { AppointmentsController } from './controllers/appointments.controller';
import { PatientsController } from './controllers/patients.controller';
import { AdminController } from './controllers/admin.controller';
import { DemoController } from './controllers/demo.controller';
import { demoModeEnabled } from './demo/demo.constants';

const PORT = Number(process.env.PORT ?? 5000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_in_production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'dev_jwt_refresh_secret_change_in_production';

const CORS_ORIGINS = new Set(
  (process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean)) ?? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ],
);

// EN: Function matcher (the array form of `origin` is not reflected back by the
//     veloce-ts CORS middleware — it must be a function or string). Allow listed
//     origins plus any localhost port in development for convenience.
// ES: Matcher por función (el form array de `origin` no lo refleja el CORS de
//     veloce-ts — debe ser función o string). Permite los orígenes listados más
//     cualquier puerto localhost en desarrollo.
function isAllowedOrigin(origin: string): boolean {
  if (CORS_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

const app = new Veloce({
  title: 'Sistema de Citas Médicas API',
  version: '1.0.0',
  description: 'API REST para gestión de citas médicas (Veloce-TS)',
  // El tope por omisión del framework es 1 MiB y un PDF de laboratorio lo pasa
  // sin esfuerzo. Este margen deja subir los 5 MiB del servicio más el sobre
  // del multipart.
  bodyLimit: DOCUMENT_MAX_BYTES + 512 * 1024,
  cors: {
    origin: isAllowedOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// ─── Plugins (order: OpenAPI → Auth → RBAC) ───────────────────────────────────

app.usePlugin(new OpenAPIPlugin({ path: '/openapi.json', docsPath: '/docs' }));

const authPlugin = new AuthPlugin({
  jwt: {
    secret: JWT_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '24h',
    refreshSecret: JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  userProvider: customUserProvider,
  enableDefaultRoutes: false,
});
app.usePlugin(authPlugin);

app.usePlugin(
  new RBACPlugin({
    roles: [
      { name: 'patient', permissions: ['appointments:own'], level: 10 },
      { name: 'doctor', permissions: ['appointments:read', 'patients:write'], inherits: ['patient'], level: 50 },
      { name: 'admin', permissions: ['*'], inherits: ['doctor'], level: 100 },
    ],
  }),
);

// ─── Global rate limit ────────────────────────────────────────────────────────

app.useRateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_MAX ?? 300) });

// ─── Drizzle ORM (must run before compile) ────────────────────────────────────

registerDrizzle(app, db);

// ─── Controllers ──────────────────────────────────────────────────────────────

app.include(AuthController);
app.include(DoctorsController);
app.include(AppointmentsController);
app.include(PatientsController);
app.include(AdminController);

// EN: Only with DEMO_MODE on. Off, these routes are never registered, so they
//     answer 404 instead of 403 — a 403 would confirm there is something here.
// ES: Solo con DEMO_MODE encendido. Apagado, estas rutas no se registran, así
//     que responden 404 y no 403 — un 403 confirmaría que hay algo aquí.
if (demoModeEnabled()) {
  app.include(DemoController);
  console.warn('DEMO_MODE encendido: /api/demo/session entrega sesiones sin contraseña');
}

// ─── DI services (before compile) ─────────────────────────────────────────────

const container = app.getContainer();

// Reuse the same JWTProvider the AuthPlugin uses to verify tokens, so the
// AuthService signs tokens that validate against the identical secret.
const jwtProvider = authPlugin.getAuthService().getJWTProvider();
container.register(JWTProvider, { factory: () => jwtProvider, scope: 'singleton' });

const emailService = new EmailService();
container.register(EmailService, { factory: () => emailService, scope: 'singleton' });

const storageProvider = createStorageProvider();
container.register('StorageProvider', { factory: () => storageProvider, scope: 'singleton' });

container.register(AuthService, {
  factory: () => new AuthService(jwtProvider),
  scope: 'singleton',
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.getHono().get('/health', (c) =>
  c.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  }),
);

// ─── Daily reminders (08:00 local) ────────────────────────────────────────────

function scheduleDailyReminders() {
  const run = () => emailService.sendDailyReminders(db).catch((e) => console.error('Reminders job error:', e));
  const next8am = () => {
    const now = new Date();
    const t = new Date(now);
    t.setHours(8, 0, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t.getTime() - now.getTime();
  };
  setTimeout(function tick() {
    run();
    setTimeout(tick, 24 * 60 * 60_000);
  }, next8am());
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await emailService.init();
    console.log('🔄 Compiling application...');
    await app.compile();
    console.log('✅ Application compiled successfully');

    scheduleDailyReminders();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📚 Docs: http://localhost:${PORT}/docs`);
      console.log(`📄 OpenAPI: http://localhost:${PORT}/openapi.json`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
