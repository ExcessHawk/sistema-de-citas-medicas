import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/shared/auth/auth-context'
import { ApiError } from '@/shared/api/client'
import type { RegisterPayload } from '@/shared/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SPECIALTIES = [
  'Cardiología',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Ginecología',
  'Neurología',
  'Oftalmología',
  'Ortopedia',
  'Pediatría',
  'Psiquiatría',
  'Radiología',
  'Urología',
]

const schema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    role: z.enum(['patient', 'doctor']),
    phone: z.string().optional(),
    address: z.string().optional(),
    specialty: z.string().optional(),
    licenseNumber: z.string().optional(),
    consultationFee: z.string().optional(),
    availableHours: z.string().optional(),
  })
  .refine(
    (d) =>
      d.role !== 'doctor' || (!!d.specialty && !!d.licenseNumber && !!d.consultationFee),
    { message: 'Especialidad, cédula y tarifa son obligatorias para doctores', path: ['specialty'] },
  )
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'patient' } })

  const role = watch('role')

  const onSubmit = async (values: FormValues) => {
    const payload: RegisterPayload = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      phone: values.phone || undefined,
      address: values.address || undefined,
    }
    if (values.role === 'doctor') {
      payload.specialty = values.specialty
      payload.licenseNumber = values.licenseNumber
      payload.consultationFee = values.consultationFee ? Number(values.consultationFee) : undefined
      payload.availableHours = values.availableHours
        ? values.availableHours.split(',').map((s) => s.trim()).filter(Boolean)
        : []
    }
    try {
      const user = await registerUser(payload)
      toast.success(`Cuenta creada. ¡Bienvenido, ${user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al registrar')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Únete al sistema de citas médicas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" error={errors.name?.message}>
                <Input {...register('name')} placeholder="Juan Pérez" />
              </Field>
              <Field label="Correo electrónico" error={errors.email?.message}>
                <Input type="email" {...register('email')} placeholder="juan@email.com" />
              </Field>
              <Field label="Contraseña" error={errors.password?.message}>
                <Input type="password" {...register('password')} placeholder="••••••••" />
              </Field>
              <Field label="Tipo de usuario">
                <Select
                  value={role}
                  onValueChange={(v) => v && setValue('role', v as 'patient' | 'doctor')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Paciente</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Teléfono">
                <Input {...register('phone')} placeholder="+52 55 1234 5678" />
              </Field>
              <Field label="Dirección">
                <Input {...register('address')} placeholder="Ciudad, Estado" />
              </Field>
            </div>

            {role === 'doctor' && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Información profesional</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Especialidad" error={errors.specialty?.message}>
                    <Select onValueChange={(v) => setValue('specialty', String(v ?? ''))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Cédula profesional">
                    <Input {...register('licenseNumber')} placeholder="12345678" />
                  </Field>
                  <Field label="Tarifa de consulta ($)">
                    <Input type="number" min="0" step="0.01" {...register('consultationFee')} />
                  </Field>
                  <Field label="Horarios (separados por coma)">
                    <Input {...register('availableHours')} placeholder="09:00, 09:30, 10:00" />
                  </Field>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
