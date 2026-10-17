/** Formatting + Spanish enum labels. */
import dayjs from 'dayjs'
import type {
  AppointmentStatus,
  ConditionType,
  DocumentType,
  FollowUpType,
  FollowUpStatus,
  MedicationAdherence,
  Severity,
} from '@/shared/api/types'

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = dayjs(value)
  return d.isValid() ? d.format('D [de] MMMM [de] YYYY') : value
}

export function formatTime(value?: string | null): string {
  if (!value) return '—'
  return value.slice(0, 5) // HH:MM from HH:MM:SS
}

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

export const followUpTypeLabel: Record<FollowUpType, string> = {
  routine: 'Rutina',
  treatment: 'Tratamiento',
  emergency: 'Emergencia',
  preventive: 'Preventivo',
}

export const followUpStatusLabel: Record<FollowUpStatus, string> = {
  scheduled: 'Programado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No asistió',
}

export const conditionTypeLabel: Record<ConditionType, string> = {
  allergy: 'Alergia',
  chronic_disease: 'Enfermedad crónica',
  surgery: 'Cirugía',
  medication: 'Medicación',
  family_history: 'Historial familiar',
  other: 'Otro',
}

export const severityLabel: Record<Severity, string> = {
  mild: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
}

export const documentTypeLabel: Record<DocumentType, string> = {
  prescription: 'Receta',
  lab_report: 'Análisis',
  imaging: 'Imagen',
  referral: 'Derivación',
  certificate: 'Certificado',
  other: 'Otro',
}

export const medicationAdherenceLabel: Record<MedicationAdherence, string> = {
  excellent: 'Excelente',
  good: 'Buena',
  fair: 'Regular',
  poor: 'Mala',
}

export const roleLabel: Record<string, string> = {
  patient: 'Paciente',
  doctor: 'Doctor',
  admin: 'Administrador',
}
