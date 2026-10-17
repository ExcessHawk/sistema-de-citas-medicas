/**
 * API types mirroring the veloce-ts backend (camelCase). Hand-written to stay in
 * sync with `backend-veloce/src` controllers/DTOs. If the backend adds a typed
 * client generator later, these can be replaced by the generated models.
 */

export type Role = 'patient' | 'doctor' | 'admin'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
export type FollowUpType = 'routine' | 'treatment' | 'emergency' | 'preventive'
export type FollowUpStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type MedicationAdherence = 'excellent' | 'good' | 'fair' | 'poor'
export type DocumentType =
  | 'prescription'
  | 'lab_report'
  | 'imaging'
  | 'referral'
  | 'certificate'
  | 'other'
export type ConditionType =
  | 'allergy'
  | 'chronic_disease'
  | 'surgery'
  | 'medication'
  | 'family_history'
  | 'other'
export type Severity = 'mild' | 'moderate' | 'severe'

export interface DoctorInfo {
  id: number
  userId: number
  specialty: string
  licenseNumber: string
  phone: string
  address: string
  consultationFee: string
  latitude: string | null
  longitude: string | null
  availableHours: string[]
  createdAt: string
  updatedAt: string
}

export interface UpdateDoctorPayload {
  specialty?: string
  licenseNumber?: string
  phone?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  consultationFee?: number
  availableHours?: string[]
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  createdAt: string
  updatedAt?: string
  doctorInfo?: DoctorInfo | null
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface Doctor {
  id: number
  name: string
  email: string
  createdAt: string
  specialty: string | null
  licenseNumber: string | null
  phone: string | null
  address: string | null
  // Coordenadas del consultorio. Admiten nulo: un doctor viejo puede no estar
  // geocodificado, y entonces el mapa simplemente no lo dibuja.
  latitude: string | null
  longitude: string | null
  availableHours: string[] | null
  consultationFee: string | null
}

export interface Appointment {
  id: number
  patientId?: number
  doctorId?: number
  appointmentDate: string
  appointmentTime: string
  status: AppointmentStatus
  notes: string | null
  /** Por qué se canceló. Solo viene con cita cancelada. */
  cancellationReason?: string | null
  createdAt: string
  updatedAt: string
  // joined, depending on viewer
  patientName?: string
  patientEmail?: string
  doctorName?: string
  doctorEmail?: string
  specialty?: string
  consultationFee?: string
  doctorPhone?: string
}

export interface Availability {
  doctorId: string
  date?: string
  availableHours?: string[]
  availableSlots?: string[]
  bookedTimes?: string[]
}

export interface AppointmentStats {
  totalAppointments: number
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface MedicalHistoryEntry {
  id: number
  patientId: number
  doctorId: number
  appointmentId: number | null
  visitDate: string
  symptoms: string | null
  diagnosis: string | null
  treatment: string | null
  medications: string | null
  vitalSigns: Record<string, unknown> | null
  labResults: string | null
  recommendations: string | null
  nextVisitDate: string | null
  createdAt: string
  patientName?: string
  doctorName?: string
  specialty?: string | null
}

export interface FollowUp {
  id: number
  patientId: number
  doctorId: number
  originalAppointmentId: number | null
  followUpType: FollowUpType
  scheduledDate: string
  status: FollowUpStatus
  notes: string | null
  treatmentProgress: string | null
  medicationAdherence: MedicationAdherence | null
  sideEffects: string | null
  patientName?: string
  patientEmail?: string
  doctorName?: string
  specialty?: string | null
}

export interface Condition {
  id: number
  patientId: number
  conditionType: ConditionType
  name: string
  description: string | null
  severity: Severity | null
  diagnosisDate: string | null
  isActive: boolean
  createdAt: string
}

export interface MedicalDocument {
  id: number
  patientId: number
  doctorId: number
  documentType: DocumentType
  title: string
  description: string | null
  filePath: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  patientName?: string
  doctorName?: string
}

export interface AdminStats {
  users: { totalUsers: number; patients: number; doctors: number; admins: number }
  appointments: AppointmentStats
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: 'patient' | 'doctor'
  phone?: string
  address?: string
  specialty?: string
  licenseNumber?: string
  consultationFee?: number
  availableHours?: string[]
}

export interface LoginPayload {
  email: string
  password: string
}

export interface UpdateProfilePayload {
  name?: string
  phone?: string
  address?: string
  specialty?: string
  consultationFee?: number
  availableHours?: string[]
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface CreateAppointmentPayload {
  doctorId: number
  appointmentDate: string
  appointmentTime: string
  notes?: string
}

export interface UpdateAppointmentPayload {
  status?: AppointmentStatus
  notes?: string
  cancellationReason?: string
}

export interface CreateMedicalHistoryPayload {
  appointmentId?: number
  visitDate: string
  symptoms?: string
  diagnosis?: string
  treatment?: string
  medications?: string
  vitalSigns?: Record<string, unknown>
  labResults?: string
  recommendations?: string
  nextVisitDate?: string
}

export interface CreateFollowUpPayload {
  patientId: number
  followUpType: FollowUpType
  scheduledDate: string
  notes?: string
  originalAppointmentId?: number
}

export interface UpdateFollowUpPayload {
  status?: FollowUpStatus
  notes?: string
  treatmentProgress?: string
  medicationAdherence?: MedicationAdherence
  sideEffects?: string
}

export interface CreateConditionPayload {
  patientId: number
  conditionType: ConditionType
  name: string
  description?: string
  severity?: Severity
  diagnosisDate?: string
  isActive?: boolean
}

export interface CreateDocumentPayload {
  patientId: number
  documentType: DocumentType
  title: string
  description?: string
  filePath?: string
  fileSize?: number
  mimeType?: string
}
