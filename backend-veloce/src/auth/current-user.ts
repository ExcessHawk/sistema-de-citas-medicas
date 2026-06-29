/**
 * @file Current-user helpers.
 *
 * EN: The JWT payload signed at login carries the numeric `id`, `email` and
 *     `role` claims (plus `roles` for the RBAC plugin). `AuthPlugin` populates
 *     `auth.user` on every request with a valid Bearer token; `@Roles(...)`
 *     enforces access. These helpers read that payload back as a typed value.
 * ES: El payload JWT firmado en login lleva `id` numérico, `email` y `role`
 *     (más `roles` para el plugin RBAC). `AuthPlugin` rellena `auth.user` en
 *     cada request con Bearer válido; `@Roles(...)` controla el acceso. Estos
 *     helpers releen ese payload de forma tipada.
 */
import { getCurrentUser, UnauthorizedException } from 'veloce-ts';
import type { Context } from 'hono';

export type AppRole = 'patient' | 'doctor' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: AppRole;
}

/**
 * EN: Read the authenticated user from context. Throws 401 when missing — use
 *     on routes already gated by `@Roles(...)` to get a typed, non-null user.
 * ES: Lee el usuario autenticado del contexto. Lanza 401 si falta — usar en
 *     rutas ya protegidas por `@Roles(...)` para obtener un usuario tipado.
 */
export function requireUser(c: Context): AuthUser {
  const payload = getCurrentUser(c) as { id?: number; sub?: string; email?: string; role?: AppRole } | null;
  if (!payload || payload.id == null || !payload.email || !payload.role) {
    throw new UnauthorizedException('Autenticación requerida');
  }
  return { id: Number(payload.id), email: payload.email, role: payload.role };
}

/** EN: Convenience: is this user an admin? | ES: ¿Es admin este usuario? */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin';
}
