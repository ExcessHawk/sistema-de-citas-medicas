/**
 * @file Zod DTOs for auth routes (ported from express-validator rules).
 * EN: camelCase request bodies. Doctor registration requires specialty,
 *     licenseNumber and consultationFee (enforced with a refine).
 * ES: Cuerpos camelCase. El registro de doctor exige specialty, licenseNumber
 *     y consultationFee (validado con refine).
 */
import { z } from 'zod';

export const RegisterSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: z.enum(['patient', 'doctor'], { errorMap: () => ({ message: 'Rol inválido' }) }),
    phone: z.string().optional(),
    address: z.string().optional(),
    specialty: z.string().optional(),
    licenseNumber: z.string().optional(),
    consultationFee: z.number().min(0, 'Tarifa de consulta inválida').optional(),
    availableHours: z.array(z.string()).optional(),
  })
  .refine(
    (d) => d.role !== 'doctor' || (!!d.specialty && !!d.licenseNumber && d.consultationFee != null),
    {
      message:
        'Los doctores deben proporcionar especialidad, cédula profesional y tarifa de consulta',
      path: ['role'],
    },
  );
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialty: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  availableHours: z.array(z.string()).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
