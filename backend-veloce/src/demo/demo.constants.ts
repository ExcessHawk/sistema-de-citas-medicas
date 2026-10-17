/**
 * @file Shared constants for the public demo.
 *
 * EN: The demo hands out sessions without a password. That is an intentional
 *     authentication bypass, so it is fenced by four locks that live in two
 *     files which must agree: the flag below, the email domain, the `is_demo`
 *     column, and a second check inside the auth service.
 * ES: La demostración entrega sesiones sin contraseña. Es un bypass de
 *     autenticación puesto a propósito, así que lleva cuatro candados en dos
 *     archivos que tienen que estar de acuerdo: la bandera de abajo, el
 *     dominio del correo, la columna `is_demo`, y una segunda comprobación
 *     dentro del servicio de autenticación.
 */

export const DEMO_DOMAIN = '@demo.citas.mx';

export const DEMO_ROLES = ['paciente', 'doctor', 'admin'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ACCOUNTS: Record<DemoRole, string> = {
  paciente: `paciente${DEMO_DOMAIN}`,
  doctor: `doctor${DEMO_DOMAIN}`,
  admin: `admin${DEMO_DOMAIN}`,
};

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true';
}
