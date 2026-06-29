/**
 * @file Appointments controller — `/api/appointments/*`.
 *
 * EN: All routes require authentication (any role). A patient sees/creates
 *     their own appointments; a doctor sees theirs; admin sees all. Ownership
 *     is enforced in-handler (patient_id / doctor_id must match the caller
 *     unless admin). Confirmation/cancellation emails are best-effort.
 * ES: Todas las rutas requieren autenticación (cualquier rol). El paciente
 *     ve/crea sus citas; el doctor ve las suyas; admin ve todas. La propiedad
 *     se valida en el handler. Los emails de confirmación/cancelación son
 *     best-effort.
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Ctx,
  Roles,
  InjectDB,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from 'veloce-ts';
import type { Context } from 'hono';
import { and, eq, ne, sql, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../db/client';
import { appointments, users, doctors } from '../db/schema';
import { requireUser } from '../auth/current-user';
import { EmailService } from '../services/email.service';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  type CreateAppointmentDto,
  type UpdateAppointmentDto,
} from '../dtos/appointments.dto';

const ANY_ROLE = ['patient', 'doctor', 'admin'];

@Controller('/api/appointments')
export class AppointmentsController {
  constructor(
    @InjectDB() private db: DrizzleDB,
    @Inject(EmailService) private email: EmailService,
  ) {}

  /** EN: `GET /api/appointments` — caller's appointments (role-shaped). */
  @Get('/')
  @Roles(ANY_ROLE)
  async list(@Ctx() c: Context) {
    const user = requireUser(c);
    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');

    if (user.role === 'doctor') {
      const rows = await this.db
        .select({
          id: appointments.id,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          patientName: patient.name,
          patientEmail: patient.email,
          specialty: doctors.specialty,
          consultationFee: doctors.consultationFee,
        })
        .from(appointments)
        .innerJoin(patient, eq(appointments.patientId, patient.id))
        .innerJoin(doctors, eq(appointments.doctorId, doctors.userId))
        .where(eq(appointments.doctorId, user.id))
        .orderBy(desc(appointments.appointmentDate), asc(appointments.appointmentTime));
      return { appointments: rows };
    }

    const rows = await this.db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        doctorName: doctorUser.name,
        doctorEmail: doctorUser.email,
        specialty: doctors.specialty,
        consultationFee: doctors.consultationFee,
        doctorPhone: doctors.phone,
      })
      .from(appointments)
      .innerJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.userId))
      .where(eq(appointments.patientId, user.id))
      .orderBy(desc(appointments.appointmentDate), asc(appointments.appointmentTime));
    return { appointments: rows };
  }

  /**
   * EN: `GET /api/appointments/stats/overview` — doctor: own counts; admin (or
   *     other roles): global counts. Declared before `/:id` so the literal
   *     segment wins.
   * ES: Estadísticas por estado. Doctor: propias; admin/otros: globales.
   */
  @Get('/stats/overview')
  @Roles(ANY_ROLE)
  async stats(@Ctx() c: Context) {
    const user = requireUser(c);
    const counts = {
      totalAppointments: sql<number>`count(*)::int`,
      scheduled: sql<number>`count(*) filter (where ${appointments.status} = 'scheduled')::int`,
      confirmed: sql<number>`count(*) filter (where ${appointments.status} = 'confirmed')::int`,
      completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')::int`,
    };
    const query = this.db.select(counts).from(appointments);
    const [row] =
      user.role === 'doctor'
        ? await query.where(eq(appointments.doctorId, user.id))
        : await query;
    return { stats: row };
  }

  /** EN: `GET /api/appointments/:id` — detail with ownership check. */
  @Get('/:id')
  @Roles(ANY_ROLE)
  async detail(@Param('id') id: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');

    const [appt] = await this.db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientName: patient.name,
        patientEmail: patient.email,
        doctorName: doctorUser.name,
        doctorEmail: doctorUser.email,
        specialty: doctors.specialty,
        consultationFee: doctors.consultationFee,
        doctorPhone: doctors.phone,
      })
      .from(appointments)
      .innerJoin(patient, eq(appointments.patientId, patient.id))
      .innerJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.userId))
      .where(eq(appointments.id, Number(id)));
    if (!appt) throw new NotFoundException('Cita no encontrada');

    if (user.role !== 'admin' && user.id !== appt.patientId && user.id !== appt.doctorId) {
      throw new ForbiddenException('No tienes permisos para ver esta cita');
    }
    return { appointment: appt };
  }

  /** EN: `POST /api/appointments` — patient books a slot. */
  @Post('/')
  @Roles(ANY_ROLE)
  async create(@Body(CreateAppointmentSchema) body: CreateAppointmentDto, @Ctx() c: Context) {
    const user = requireUser(c);

    const [doctor] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        specialty: doctors.specialty,
        availableHours: doctors.availableHours,
      })
      .from(users)
      .innerJoin(doctors, eq(users.id, doctors.userId))
      .where(and(eq(users.id, body.doctorId), eq(users.role, 'doctor')));
    if (!doctor) throw new NotFoundException('Doctor no encontrado');

    const availableHours = (doctor.availableHours as string[]) ?? [];
    if (!availableHours.includes(body.appointmentTime)) {
      throw new BadRequestException('El horario seleccionado no está disponible para este doctor');
    }

    const [conflict] = await this.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, body.doctorId),
          eq(appointments.appointmentDate, body.appointmentDate),
          eq(appointments.appointmentTime, body.appointmentTime),
          ne(appointments.status, 'cancelled'),
        ),
      );
    if (conflict) throw new BadRequestException('El horario seleccionado ya está ocupado');

    const when = new Date(`${body.appointmentDate} ${body.appointmentTime}`);
    if (when <= new Date()) throw new BadRequestException('No se pueden programar citas en el pasado');

    const [appt] = await this.db
      .insert(appointments)
      .values({
        patientId: user.id,
        doctorId: body.doctorId,
        appointmentDate: body.appointmentDate,
        appointmentTime: body.appointmentTime,
        notes: body.notes,
        status: 'scheduled',
      })
      .returning();

    this.email
      .sendAppointmentConfirmation(
        user.email,
        user.email,
        doctor.name,
        body.appointmentDate,
        body.appointmentTime,
        doctor.specialty,
      )
      .catch(() => {
        /* best-effort */
      });

    c.status(201);
    return {
      message: 'Cita programada exitosamente',
      appointment: {
        id: appt.id,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        status: appt.status,
        doctorName: doctor.name,
        specialty: doctor.specialty,
      },
    };
  }

  /** EN: `PUT /api/appointments/:id` — update status/notes (ownership). */
  @Put('/:id')
  @Roles(ANY_ROLE)
  async update(
    @Param('id') id: string,
    @Body(UpdateAppointmentSchema) body: UpdateAppointmentDto,
    @Ctx() c: Context,
  ) {
    const user = requireUser(c);
    const existing = await this.loadWithParties(Number(id));
    if (!existing) throw new NotFoundException('Cita no encontrada');
    if (user.role !== 'admin' && user.id !== existing.patientId && user.id !== existing.doctorId) {
      throw new ForbiddenException('No tienes permisos para actualizar esta cita');
    }

    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (Object.keys(patch).length === 0) throw new BadRequestException('No hay campos para actualizar');
    patch.updatedAt = new Date();

    const [updated] = await this.db
      .update(appointments)
      .set(patch)
      .where(eq(appointments.id, Number(id)))
      .returning();

    if (body.status === 'cancelled' && existing.status !== 'cancelled') {
      this.email
        .sendCancellationEmail(
          existing.patientEmail,
          existing.patientName,
          existing.doctorName,
          existing.appointmentDate,
          existing.appointmentTime,
        )
        .catch(() => {
          /* best-effort */
        });
    }

    return { message: 'Cita actualizada exitosamente', appointment: updated };
  }

  /** EN: `DELETE /api/appointments/:id` — cancel (ownership). */
  @Delete('/:id')
  @Roles(ANY_ROLE)
  async cancel(@Param('id') id: string, @Ctx() c: Context) {
    const user = requireUser(c);
    const existing = await this.loadWithParties(Number(id));
    if (!existing) throw new NotFoundException('Cita no encontrada');
    if (user.role !== 'admin' && user.id !== existing.patientId && user.id !== existing.doctorId) {
      throw new ForbiddenException('No tienes permisos para cancelar esta cita');
    }
    if (existing.status === 'cancelled') throw new BadRequestException('La cita ya está cancelada');

    await this.db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, Number(id)));

    this.email
      .sendCancellationEmail(
        existing.patientEmail,
        existing.patientName,
        existing.doctorName,
        existing.appointmentDate,
        existing.appointmentTime,
      )
      .catch(() => {
        /* best-effort */
      });

    return { message: 'Cita cancelada exitosamente' };
  }

  /** EN: Load an appointment with patient/doctor names + emails for emails. */
  private async loadWithParties(id: number) {
    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');
    const [row] = await this.db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        status: appointments.status,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        patientName: patient.name,
        patientEmail: patient.email,
        doctorName: doctorUser.name,
        doctorEmail: doctorUser.email,
      })
      .from(appointments)
      .innerJoin(patient, eq(appointments.patientId, patient.id))
      .innerJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
      .where(eq(appointments.id, id));
    return row ?? null;
  }
}
