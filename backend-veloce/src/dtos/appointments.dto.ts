/**
 * @file Zod DTOs for appointment routes.
 */
import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  doctorId: z.number().int('ID de doctor requerido'),
  appointmentDate: z.string().min(1, 'Fecha de cita requerida'), // YYYY-MM-DD
  appointmentTime: z.string().min(1, 'Hora de cita requerida'), // HH:MM
  notes: z.string().optional(),
});
export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
  cancellationReason: z.string().trim().min(3).max(300).optional(),
});
export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;
