/**
 * @file Zod DTOs for patient clinical routes: medical history, follow-ups,
 *       conditions and documents.
 */
import { z } from 'zod';

// ─── Medical history ──────────────────────────────────────────────────────────

export const CreateMedicalHistorySchema = z.object({
  appointmentId: z.number().int().optional(),
  visitDate: z.string().min(1, 'Fecha de visita es requerida'),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.string().optional(),
  vitalSigns: z.record(z.any()).optional(),
  labResults: z.string().optional(),
  recommendations: z.string().optional(),
  nextVisitDate: z.string().optional(),
});
export type CreateMedicalHistoryDto = z.infer<typeof CreateMedicalHistorySchema>;

export const UpdateMedicalHistorySchema = CreateMedicalHistorySchema.partial();
export type UpdateMedicalHistoryDto = z.infer<typeof UpdateMedicalHistorySchema>;

// ─── Follow-ups ───────────────────────────────────────────────────────────────

export const CreateFollowUpSchema = z.object({
  patientId: z.number().int('ID de paciente es requerido'),
  followUpType: z.enum(['routine', 'treatment', 'emergency', 'preventive'], {
    errorMap: () => ({ message: 'Tipo de seguimiento inválido' }),
  }),
  scheduledDate: z.string().min(1, 'Fecha programada es requerida'),
  notes: z.string().optional(),
  originalAppointmentId: z.number().int().optional(),
});
export type CreateFollowUpDto = z.infer<typeof CreateFollowUpSchema>;

export const UpdateFollowUpSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional(),
  treatmentProgress: z.string().optional(),
  medicationAdherence: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  sideEffects: z.string().optional(),
});
export type UpdateFollowUpDto = z.infer<typeof UpdateFollowUpSchema>;

// ─── Conditions ───────────────────────────────────────────────────────────────

export const CreateConditionSchema = z.object({
  patientId: z.number().int('ID de paciente es requerido'),
  conditionType: z.enum(
    ['allergy', 'chronic_disease', 'surgery', 'medication', 'family_history', 'other'],
    { errorMap: () => ({ message: 'Tipo de condición inválido' }) },
  ),
  name: z.string().min(1, 'Nombre de la condición es requerido'),
  description: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  diagnosisDate: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateConditionDto = z.infer<typeof CreateConditionSchema>;

// ─── Documents ────────────────────────────────────────────────────────────────

export const CreateDocumentSchema = z.object({
  patientId: z.number().int('ID de paciente es requerido'),
  documentType: z.enum(
    ['prescription', 'lab_report', 'imaging', 'referral', 'certificate', 'other'],
    { errorMap: () => ({ message: 'Tipo de documento inválido' }) },
  ),
  title: z.string().min(1, 'Título del documento es requerido'),
  description: z.string().optional(),
  filePath: z.string().optional(),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
});
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
