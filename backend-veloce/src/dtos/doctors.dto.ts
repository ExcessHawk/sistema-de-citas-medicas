/**
 * @file Zod DTOs for doctor profile routes.
 */
import { z } from 'zod';

// EN: consulting room coordinates. Bounded to real values so a typo cannot put
//     a doctor in the middle of the ocean.
// ES: coordenadas del consultorio. Acotadas a valores reales para que un dedazo
//     no ponga a un doctor en medio del océano.
const Latitude = z.number().min(-90).max(90);
const Longitude = z.number().min(-180).max(180);

export const CreateDoctorSchema = z.object({
  // EN: admins may target another user; doctors default to themselves.
  userId: z.number().int().optional(),
  specialty: z.string().trim().min(1, 'Especialidad requerida'),
  licenseNumber: z.string().trim().min(1, 'Número de licencia requerido'),
  phone: z.string().trim().min(1, 'Teléfono requerido'),
  address: z.string().trim().min(1, 'Dirección requerida'),
  latitude: Latitude.optional(),
  longitude: Longitude.optional(),
  consultationFee: z.number({ invalid_type_error: 'Tarifa de consulta debe ser numérica' }).min(0),
  availableHours: z.array(z.string()).default([]),
});
export type CreateDoctorDto = z.infer<typeof CreateDoctorSchema>;

export const UpdateDoctorSchema = z.object({
  specialty: z.string().trim().min(1).optional(),
  licenseNumber: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  latitude: Latitude.nullable().optional(),
  longitude: Longitude.nullable().optional(),
  consultationFee: z.number().min(0).optional(),
  availableHours: z.array(z.string()).optional(),
});
export type UpdateDoctorDto = z.infer<typeof UpdateDoctorSchema>;

export const AvailabilityQuerySchema = z.object({
  date: z.string().optional(),
});
export type AvailabilityQueryDto = z.infer<typeof AvailabilityQuerySchema>;
