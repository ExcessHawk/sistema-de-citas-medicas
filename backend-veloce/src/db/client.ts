/**
 * @file Drizzle ORM client bound to a shared `pg.Pool`.
 *
 * EN: Single source of truth for database access. Exports the `db` instance
 *     (registered in DI via `registerDrizzle` in `index.ts`) and the
 *     `DrizzleDB` type alias used to annotate constructor params and helpers.
 * ES: Única fuente de verdad para el acceso a la base de datos. Expone la
 *     instancia `db` (registrada en DI con `registerDrizzle` en `index.ts`) y
 *     el alias `DrizzleDB` para tipar parámetros de constructor y helpers.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** EN: Drizzle client (singleton). | ES: Cliente Drizzle (singleton). */
export const db = drizzle(pool, { schema });

/** EN: Convenience type for typed `db` parameters. | ES: Tipo de conveniencia. */
export type DrizzleDB = typeof db;
