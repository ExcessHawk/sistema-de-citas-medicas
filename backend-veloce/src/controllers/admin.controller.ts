/**
 * @file Admin controller — `/api/admin/*` (admin-only).
 *
 * EN: System overview stats and user listing. The legacy backend shipped these
 *     as placeholder stubs; here they return real aggregates.
 * ES: Estadísticas del sistema y listado de usuarios. El backend legacy las
 *     tenía como stubs; aquí devuelven agregados reales.
 */
import { Controller, Get, Roles, InjectDB } from 'veloce-ts';
import { sql } from 'drizzle-orm';
import type { DrizzleDB } from '../db/client';
import { users, appointments } from '../db/schema';

@Controller('/api/admin')
export class AdminController {
  constructor(@InjectDB() private db: DrizzleDB) {}

  /** EN: `GET /api/admin/stats` — counts by user role and appointment status. */
  @Get('/stats')
  @Roles(['admin'])
  async stats() {
    const [userCounts] = await this.db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        patients: sql<number>`count(*) filter (where ${users.role} = 'patient')::int`,
        doctors: sql<number>`count(*) filter (where ${users.role} = 'doctor')::int`,
        admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
      })
      .from(users);

    const [apptCounts] = await this.db
      .select({
        totalAppointments: sql<number>`count(*)::int`,
        scheduled: sql<number>`count(*) filter (where ${appointments.status} = 'scheduled')::int`,
        confirmed: sql<number>`count(*) filter (where ${appointments.status} = 'confirmed')::int`,
        completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')::int`,
      })
      .from(appointments);

    return { users: userCounts, appointments: apptCounts };
  }

  /** EN: `GET /api/admin/users` — list all users (no password). */
  @Get('/users')
  @Roles(['admin'])
  async listUsers() {
    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.name);
    return { users: rows };
  }
}
