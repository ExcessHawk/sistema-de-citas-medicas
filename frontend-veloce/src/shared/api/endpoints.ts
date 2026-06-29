/** Typed endpoint functions, grouped by resource. */
import { api } from './client'
import type {
  AuthResponse,
  User,
  Doctor,
  Appointment,
  Availability,
  AppointmentStats,
  MedicalHistoryEntry,
  FollowUp,
  Condition,
  MedicalDocument,
  AdminStats,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  CreateMedicalHistoryPayload,
  CreateFollowUpPayload,
  UpdateFollowUpPayload,
  CreateConditionPayload,
  CreateDocumentPayload,
} from './types'

export const authApi = {
  register: (body: RegisterPayload) => api.post<AuthResponse>('/api/auth/register', body),
  login: (body: LoginPayload) => api.post<AuthResponse>('/api/auth/login', body),
  profile: () => api.get<User>('/api/auth/profile'),
  updateProfile: (body: UpdateProfilePayload) => api.put<User>('/api/auth/profile', body),
  changePassword: (body: ChangePasswordPayload) =>
    api.put<{ message: string }>('/api/auth/change-password', body),
}

export const doctorsApi = {
  list: () => api.get<{ doctors: Doctor[] }>('/api/doctors'),
  detail: (id: number) => api.get<{ doctor: Doctor }>(`/api/doctors/${id}`),
  availability: (id: number, date?: string) =>
    api.get<Availability>(`/api/doctors/${id}/availability`, date ? { date } : undefined),
}

export const appointmentsApi = {
  list: () => api.get<{ appointments: Appointment[] }>('/api/appointments'),
  detail: (id: number) => api.get<{ appointment: Appointment }>(`/api/appointments/${id}`),
  stats: () => api.get<{ stats: AppointmentStats }>('/api/appointments/stats/overview'),
  create: (body: CreateAppointmentPayload) =>
    api.post<{ message: string; appointment: Appointment }>('/api/appointments', body),
  update: (id: number, body: UpdateAppointmentPayload) =>
    api.put<{ message: string; appointment: Appointment }>(`/api/appointments/${id}`, body),
  cancel: (id: number) => api.del<{ message: string }>(`/api/appointments/${id}`),
}

export const patientsApi = {
  history: (patientId: number) =>
    api.get<MedicalHistoryEntry[]>(`/api/patients/patient/${patientId}`),
  createHistory: (patientId: number, body: CreateMedicalHistoryPayload) =>
    api.post<MedicalHistoryEntry>(`/api/patients/patient/${patientId}`, body),
  updateHistory: (historyId: number, body: Partial<CreateMedicalHistoryPayload>) =>
    api.put<MedicalHistoryEntry>(`/api/patients/${historyId}`, body),

  followUps: (patientId: number) =>
    api.get<FollowUp[]>(`/api/patients/follow-ups/patient/${patientId}`),
  doctorFollowUps: () => api.get<FollowUp[]>('/api/patients/follow-ups/doctor'),
  createFollowUp: (body: CreateFollowUpPayload) =>
    api.post<FollowUp>('/api/patients/follow-ups', body),
  updateFollowUp: (followUpId: number, body: UpdateFollowUpPayload) =>
    api.put<FollowUp>(`/api/patients/follow-ups/${followUpId}`, body),

  conditions: (patientId: number) =>
    api.get<Condition[]>(`/api/patients/conditions/patient/${patientId}`),
  createCondition: (body: CreateConditionPayload) =>
    api.post<Condition>('/api/patients/conditions', body),

  documents: (patientId: number) =>
    api.get<MedicalDocument[]>(`/api/patients/documents/patient/${patientId}`),
  createDocument: (body: CreateDocumentPayload) =>
    api.post<MedicalDocument>('/api/patients/documents', body),
}

export const adminApi = {
  stats: () => api.get<AdminStats>('/api/admin/stats'),
  users: () => api.get<{ users: User[] }>('/api/admin/users'),
}
