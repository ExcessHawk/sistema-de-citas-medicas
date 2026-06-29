/**
 * @file Email service (nodemailer) — ported from the legacy `emailService.js`.
 *
 * EN: Singleton registered in DI. `init()` builds the Gmail transporter when
 *     EMAIL_USER/EMAIL_PASS are present; otherwise every send is a no-op so the
 *     API keeps working without email configured. All send methods swallow
 *     transporter-missing and log errors — callers must not let email failures
 *     break the request flow (matches legacy behavior).
 * ES: Singleton en DI. `init()` crea el transporter Gmail si existen
 *     EMAIL_USER/EMAIL_PASS; si no, cada envío es no-op y la API sigue
 *     funcionando sin email. Los métodos toleran transporter ausente y
 *     registran errores — los callers no deben romperse por fallos de email.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, users, doctors } from '../db/schema';
import type { DrizzleDB } from '../db/client';

const FROM = () => `"Sistema de Citas Médicas" <${process.env.EMAIL_USER}>`;

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export class EmailService {
  private transporter: Transporter | null = null;

  /** EN: Configure the transporter. Safe to call once at boot. */
  async init(): Promise<void> {
    const { EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log('⚠️ Servicio de email no configurado — los envíos serán no-op');
      return;
    }
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT) || 587,
        secure: false,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      });
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando servicio de email:', error);
      this.transporter = null;
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      console.warn('Servicio de email no configurado');
      return;
    }
    try {
      await this.transporter.sendMail({ from: FROM(), to, subject, html });
      console.log(`📧 Email enviado a ${to} — ${subject}`);
    } catch (error) {
      console.error('Error enviando email:', error);
      // Do not rethrow — email is best-effort.
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.send(
      email,
      '¡Bienvenido al Sistema de Citas Médicas!',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">¡Bienvenido, ${name}!</h2>
        <p>Gracias por registrarte en nuestro sistema de gestión de citas médicas.</p>
        <p>Ahora puedes:</p>
        <ul>
          <li>Buscar doctores disponibles</li>
          <li>Programar citas médicas</li>
          <li>Gestionar tus citas existentes</li>
          <li>Recibir recordatorios por email</li>
        </ul>
        <p>Saludos,<br>El equipo de Citas Médicas</p>
      </div>`,
    );
  }

  async sendAppointmentConfirmation(
    email: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    specialty: string,
  ): Promise<void> {
    await this.send(
      email,
      'Confirmación de Cita Médica',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✅ Cita Confirmada</h2>
        <p>Hola ${patientName},</p>
        <p>Tu cita médica ha sido programada exitosamente.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Detalles de la Cita</h3>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Especialidad:</strong> ${specialty}</p>
          <p><strong>Fecha:</strong> ${formatDate(date)}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>Recibirás un recordatorio 24 horas antes de tu cita.</p>
        <p>Saludos,<br>El equipo de Citas Médicas</p>
      </div>`,
    );
  }

  async sendAppointmentReminder(
    email: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    specialty: string,
  ): Promise<void> {
    await this.send(
      email,
      'Recordatorio: Tu cita médica es mañana',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">⏰ Recordatorio de Cita</h2>
        <p>Hola ${patientName},</p>
        <p>Te recordamos que tienes una cita médica mañana.</p>
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Detalles de la Cita</h3>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Especialidad:</strong> ${specialty}</p>
          <p><strong>Fecha:</strong> ${formatDate(date)}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>¡Esperamos verte pronto!</p>
        <p>Saludos,<br>El equipo de Citas Médicas</p>
      </div>`,
    );
  }

  async sendCancellationEmail(
    email: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
  ): Promise<void> {
    await this.send(
      email,
      'Cita Médica Cancelada',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">❌ Cita Cancelada</h2>
        <p>Hola ${patientName},</p>
        <p>Tu cita médica ha sido cancelada.</p>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Detalles de la Cita Cancelada</h3>
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Fecha:</strong> ${formatDate(date)}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>Si necesitas reprogramar, puedes hacerlo desde tu cuenta en cualquier momento.</p>
        <p>Saludos,<br>El equipo de Citas Médicas</p>
      </div>`,
    );
  }

  /**
   * EN: Send reminders for every scheduled/confirmed appointment happening
   *     tomorrow. Intended to be called once a day by a scheduler in index.ts.
   * ES: Envía recordatorios para cada cita programada/confirmada de mañana.
   *     Pensado para invocarse una vez al día desde un scheduler en index.ts.
   */
  async sendDailyReminders(db: DrizzleDB): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // `users` is joined twice (patient + doctor), so alias the second instance.
    const patient = alias(users, 'patient');
    const doctorUser = alias(users, 'doctor_user');

    const rows = await db
      .select({
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        patientName: patient.name,
        patientEmail: patient.email,
        doctorName: doctorUser.name,
        specialty: doctors.specialty,
      })
      .from(appointments)
      .innerJoin(patient, eq(appointments.patientId, patient.id))
      .innerJoin(doctorUser, eq(appointments.doctorId, doctorUser.id))
      .innerJoin(doctors, eq(appointments.doctorId, doctors.userId))
      .where(
        and(
          eq(appointments.appointmentDate, tomorrowDate),
          inArray(appointments.status, ['scheduled', 'confirmed']),
        ),
      );

    for (const r of rows) {
      await this.sendAppointmentReminder(
        r.patientEmail,
        r.patientName,
        r.doctorName,
        r.appointmentDate,
        r.appointmentTime,
        r.specialty,
      );
    }
    console.log(`📧 Enviados ${rows.length} recordatorios para mañana`);
  }
}
