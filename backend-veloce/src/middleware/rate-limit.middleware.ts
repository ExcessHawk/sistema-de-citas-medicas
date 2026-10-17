/**
 * @file Per-route rate limits, on top of the global one in index.ts.
 *
 * EN: The demo session endpoint gets its own, looser limit. The playground
 *     spends one session per role switch in the iframe plus one in the API
 *     console, so a tight limit locks out a curious visitor in seconds. There
 *     is no password to guess there, so a narrow limit protects nothing; it
 *     only stops someone minting tokens without end.
 * ES: La sesión de demostración tiene su propio límite, más holgado. El
 *     playground gasta una por cada cambio de rol en el iframe y otra en la
 *     consola, así que un límite estrecho deja fuera a un visitante curioso en
 *     segundos. Ahí no hay contraseña que adivinar, de modo que un límite
 *     estrecho no protege nada; solo evita pedir tokens sin fin.
 */
import { createRateLimitMiddleware } from 'veloce-ts';
import type { Context } from 'hono';

function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
    if (hops > 0 && parts.length >= hops) {
      return parts[parts.length - hops] ?? 'unknown-ip';
    }
  }
  return c.req.header('x-real-ip') ?? 'unknown-ip';
}

export const demoRateLimit = createRateLimitMiddleware({
  windowMs: 60_000,
  max: Number(process.env.DEMO_RATE_LIMIT_MAX ?? 40),
  keyGenerator: (c) => `demo:${clientIp(c as Context)}`,
});

export const authRateLimit = createRateLimitMiddleware({
  windowMs: 60_000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
  keyGenerator: (c) => `auth:${clientIp(c as Context)}`,
});
