/**
 * @file Drizzle ORM schema for the medical appointments database.
 *
 * EN: Declarative port of `database/schema.sql`. Integer (serial) primary keys,
 *     `created_at`/`updated_at` timestamps on every table. The `updated_at`
 *     bump previously handled by Postgres triggers is now done in code at
 *     write time (see controllers/services).
 * ES: Port declarativo de `database/schema.sql`. PKs serial enteras y columnas
 *     `created_at`/`updated_at` en cada tabla. El refresco de `updated_at` que
 *     antes hacían triggers de Postgres ahora se hace en código al escribir.
 */
import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['patient', 'doctor', 'admin']);
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'confirmed',
  'cancelled',
  'completed',
]);
export const followUpTypeEnum = pgEnum('follow_up_type', [
  'routine',
  'treatment',
  'emergency',
  'preventive',
]);
export const followUpStatusEnum = pgEnum('follow_up_status', [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
]);
export const medicationAdherenceEnum = pgEnum('medication_adherence', [
  'excellent',
  'good',
  'fair',
  'poor',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'prescription',
  'lab_report',
  'imaging',
  'referral',
  'certificate',
  'other',
]);
export const conditionTypeEnum = pgEnum('condition_type', [
  'allergy',
  'chronic_disease',
  'surgery',
  'medication',
  'family_history',
  'other',
]);
export const severityEnum = pgEnum('severity', ['mild', 'moderate', 'severe']);

// ─── Shared timestamp columns ─────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
};

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  // EN: marks the accounts the public demo may sign in as, without a password.
  //     One of the four locks on that bypass; see src/demo/README of the deploy
  //     repo. Never true on a database with real people in it.
  // ES: marca las cuentas en las que la demostración pública puede entrar sin
  //     contraseña. Uno de los cuatro candados de ese bypass. Nunca true en una
  //     base con personas reales.
  isDemo: boolean('is_demo').notNull().default(false),
  ...timestamps,
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  specialty: varchar('specialty', { length: 100 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  address: text('address').notNull(),
  // EN: consulting room coordinates, so the patient can see where it is on a
  //     map before booking. Nullable: an address may not be geocoded yet.
  // ES: coordenadas del consultorio, para que el paciente vea dónde queda
  //     antes de agendar. Admite nulo: puede no estar geocodificada todavía.
  latitude: numeric('latitude', { precision: 9, scale: 6 }),
  longitude: numeric('longitude', { precision: 9, scale: 6 }),
  consultationFee: numeric('consultation_fee', { precision: 10, scale: 2 }).notNull(),
  // EN: list of available time slots, e.g. ["09:00","09:30"].
  availableHours: jsonb('available_hours').notNull().default(sql`'[]'::jsonb`),
  ...timestamps,
});

export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appointmentDate: date('appointment_date').notNull(),
    appointmentTime: time('appointment_time').notNull(),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),
    notes: text('notes'),
    /** Por qué se canceló. Null mientras la cita siga viva. */
    cancellationReason: text('cancellation_reason'),
    ...timestamps,
  },
  (t) => ({
    slotUnique: uniqueIndex('appointments_slot_unique').on(
      t.doctorId,
      t.appointmentDate,
      t.appointmentTime,
    ),
    patientIdx: index('idx_appointments_patient_id').on(t.patientId),
    doctorIdx: index('idx_appointments_doctor_id').on(t.doctorId),
    dateIdx: index('idx_appointments_date').on(t.appointmentDate),
    statusIdx: index('idx_appointments_status').on(t.status),
  }),
);

export const patientMedicalHistory = pgTable(
  'patient_medical_history',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appointmentId: integer('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    visitDate: date('visit_date').notNull(),
    symptoms: text('symptoms'),
    diagnosis: text('diagnosis'),
    treatment: text('treatment'),
    medications: text('medications'),
    // EN: { blood_pressure, heart_rate, temperature, weight, height }.
    vitalSigns: jsonb('vital_signs'),
    labResults: text('lab_results'),
    recommendations: text('recommendations'),
    nextVisitDate: date('next_visit_date'),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('idx_medical_history_patient_id').on(t.patientId),
    doctorIdx: index('idx_medical_history_doctor_id').on(t.doctorId),
    visitDateIdx: index('idx_medical_history_visit_date').on(t.visitDate),
  }),
);

export const medicalFollowUps = pgTable(
  'medical_follow_ups',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalAppointmentId: integer('original_appointment_id').references(
      () => appointments.id,
      { onDelete: 'set null' },
    ),
    followUpType: followUpTypeEnum('follow_up_type').notNull(),
    scheduledDate: date('scheduled_date').notNull(),
    status: followUpStatusEnum('status').notNull().default('scheduled'),
    notes: text('notes'),
    treatmentProgress: text('treatment_progress'),
    medicationAdherence: medicationAdherenceEnum('medication_adherence'),
    sideEffects: text('side_effects'),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('idx_follow_ups_patient_id').on(t.patientId),
    doctorIdx: index('idx_follow_ups_doctor_id').on(t.doctorId),
    scheduledDateIdx: index('idx_follow_ups_scheduled_date').on(t.scheduledDate),
  }),
);

export const medicalDocuments = pgTable(
  'medical_documents',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doctorId: integer('doctor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentType: documentTypeEnum('document_type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    filePath: varchar('file_path', { length: 500 }),
    fileSize: integer('file_size'),
    mimeType: varchar('mime_type', { length: 100 }),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('idx_documents_patient_id').on(t.patientId),
    doctorIdx: index('idx_documents_doctor_id').on(t.doctorId),
  }),
);

export const patientConditions = pgTable(
  'patient_conditions',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    conditionType: conditionTypeEnum('condition_type').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    severity: severityEnum('severity'),
    diagnosisDate: date('diagnosis_date'),
    isActive: boolean('is_active').default(true),
    ...timestamps,
  },
  (t) => ({
    patientIdx: index('idx_conditions_patient_id').on(t.patientId),
    typeIdx: index('idx_conditions_type').on(t.conditionType),
  }),
);
