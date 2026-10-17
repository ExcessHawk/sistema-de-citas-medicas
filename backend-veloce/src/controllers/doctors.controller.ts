/**
 * @file Doctors controller — `/api/doctors/*`.
 *
 * EN: Public reads (list, detail, availability). Writes require doctor/admin;
 *     a doctor may only edit their own profile, admin may edit any. Delete is
 *     admin-only.
 * ES: Lecturas públicas (lista, detalle, disponibilidad). Las escrituras exigen
 *     doctor/admin; un doctor solo edita su propio perfil, admin cualquiera.
 *     Borrar es solo admin.
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Ctx,
  Roles,
  InjectDB,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from 'veloce-ts';
import type { Context } from 'hono';
import { and, eq, ne, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../db/client';
import { users, doctors, appointments } from '../db/schema';
import { requireUser } from '../auth/current-user';
import {
  CreateDoctorSchema,
  UpdateDoctorSchema,
  AvailabilityQuerySchema,
  type CreateDoctorDto,
  type UpdateDoctorDto,
  type AvailabilityQueryDto,
} from '../dtos/doctors.dto';

@Controller('/api/doctors')
export class DoctorsController {
  constructor(@InjectDB() private db: DrizzleDB) {}

  /** EN: `GET /api/doctors` — public list of doctors with their profile. */
  @Get('/')
  async list() {
    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        phone: doctors.phone,
        address: doctors.address,
        latitude: doctors.latitude,
        longitude: doctors.longitude,
        availableHours: doctors.availableHours,
        consultationFee: doctors.consultationFee,
      })
      .from(users)
      .leftJoin(doctors, eq(users.id, doctors.userId))
      .where(eq(users.role, 'doctor'))
      .orderBy(users.name);
    return { doctors: rows };
  }

  /** EN: `GET /api/doctors/:id` — public doctor detail. */
  @Get('/:id')
  async detail(@Param('id') id: string) {
    const [doctor] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        phone: doctors.phone,
        address: doctors.address,
        latitude: doctors.latitude,
        longitude: doctors.longitude,
        availableHours: doctors.availableHours,
        consultationFee: doctors.consultationFee,
      })
      .from(users)
      .leftJoin(doctors, eq(users.id, doctors.userId))
      .where(and(eq(users.id, Number(id)), eq(users.role, 'doctor')));
    if (!doctor) throw new NotFoundException('Doctor no encontrado');
    return { doctor };
  }

  /** EN: `POST /api/doctors` — create a doctor profile (doctor/admin). */
  @Post('/')
  @Roles(['doctor', 'admin'])
  async create(@Body(CreateDoctorSchema) body: CreateDoctorDto, @Ctx() c: Context) {
    const current = requireUser(c);
    const targetUserId = current.role === 'admin' ? body.userId : current.id;
    if (targetUserId == null) throw new BadRequestException('userId requerido');

    const [target] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId));
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.role !== 'doctor') throw new BadRequestException('El usuario debe tener rol de doctor');

    const [existing] = await this.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, targetUserId));
    if (existing) throw new ConflictException('El doctor ya tiene un perfil creado');

    const [doctor] = await this.db
      .insert(doctors)
      .values({
        userId: targetUserId,
        specialty: body.specialty,
        licenseNumber: body.licenseNumber,
        phone: body.phone,
        address: body.address,
        latitude: body.latitude === undefined ? null : String(body.latitude),
        longitude: body.longitude === undefined ? null : String(body.longitude),
        consultationFee: String(body.consultationFee),
        availableHours: body.availableHours,
      })
      .returning();

    c.status(201);
    return { message: 'Perfil de doctor creado exitosamente', doctor };
  }

  /** EN: `PUT /api/doctors/:id` — update profile; doctor self-only, admin any. */
  @Put('/:id')
  @Roles(['doctor', 'admin'])
  async update(
    @Param('id') id: string,
    @Body(UpdateDoctorSchema) body: UpdateDoctorDto,
    @Ctx() c: Context,
  ) {
    const current = requireUser(c);
    const targetUserId = Number(id);
    if (current.role !== 'admin' && current.id !== targetUserId) {
      throw new ForbiddenException('No tienes permisos para actualizar este perfil');
    }

    const patch: Record<string, unknown> = {};
    if (body.specialty !== undefined) patch.specialty = body.specialty;
    if (body.licenseNumber !== undefined) patch.licenseNumber = body.licenseNumber;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.address !== undefined) patch.address = body.address;
    if (body.latitude !== undefined) patch.latitude = body.latitude === null ? null : String(body.latitude);
    if (body.longitude !== undefined) patch.longitude = body.longitude === null ? null : String(body.longitude);
    if (body.consultationFee !== undefined) patch.consultationFee = String(body.consultationFee);
    if (body.availableHours !== undefined) patch.availableHours = body.availableHours;
    if (Object.keys(patch).length === 0) throw new BadRequestException('No hay campos para actualizar');
    patch.updatedAt = new Date();

    const [doctor] = await this.db.update(doctors).set(patch).where(eq(doctors.userId, targetUserId)).returning();
    if (!doctor) throw new NotFoundException('Perfil de doctor no encontrado');
    return { message: 'Perfil de doctor actualizado exitosamente', doctor };
  }

  /** EN: `DELETE /api/doctors/:id` — admin-only. */
  @Delete('/:id')
  @Roles(['admin'])
  async remove(@Param('id') id: string) {
    const [existing] = await this.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, Number(id)));
    if (!existing) throw new NotFoundException('Perfil de doctor no encontrado');
    await this.db.delete(doctors).where(eq(doctors.userId, Number(id)));
    return { message: 'Perfil de doctor eliminado exitosamente' };
  }

  /** EN: `GET /api/doctors/:id/availability?date=YYYY-MM-DD` — public. */
  @Get('/:id/availability')
  async availability(
    @Param('id') id: string,
    @Query(AvailabilityQuerySchema) query: AvailabilityQueryDto,
  ) {
    const [doc] = await this.db
      .select({ availableHours: doctors.availableHours })
      .from(doctors)
      .where(eq(doctors.userId, Number(id)));
    if (!doc) throw new NotFoundException('Doctor no encontrado');

    const availableHours = (doc.availableHours as string[]) ?? [];

    if (query.date) {
      const booked = await this.db
        .select({ appointmentTime: appointments.appointmentTime })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, Number(id)),
            eq(appointments.appointmentDate, query.date),
            ne(appointments.status, 'cancelled'),
          ),
        );
      // Postgres `time` comes back as HH:MM:SS — normalize to HH:MM so it
      // matches the slot strings stored in `availableHours`.
      const bookedTimes = booked.map((b) => b.appointmentTime.slice(0, 5));
      const availableSlots = availableHours.filter((h) => !bookedTimes.includes(h));
      return { doctorId: id, date: query.date, availableSlots, bookedTimes };
    }

    return { doctorId: id, availableHours };
  }
}
