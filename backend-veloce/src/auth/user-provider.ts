/**
 * @file UserProvider for `AuthPlugin`.
 *
 * EN: `AuthPlugin` requires a UserProvider. Login/register are handled by our
 *     own `AuthController`/`AuthService`, so `findByCredentials` is unused;
 *     `findById` backs the optional token-verification path. Bcrypt helpers are
 *     provided for completeness.
 * ES: `AuthPlugin` exige un UserProvider. Login/registro los maneja nuestro
 *     `AuthController`/`AuthService`, así que `findByCredentials` no se usa;
 *     `findById` respalda la verificación de token. Se incluyen helpers bcrypt.
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

export const customUserProvider = {
  async findByCredentials(_username: string, _password: string) {
    return null; // Not used — AuthController handles login.
  },
  async findById(id: string) {
    const { db } = await import('../db/client');
    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    if (!user) return null;
    return {
      id: String(user.id),
      username: user.email,
      email: user.email,
      roles: [user.role],
    };
  },
  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  },
  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },
};
