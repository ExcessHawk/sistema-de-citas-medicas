import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  Anchor,
  Button,
  Card,
  Center,
  Divider,
  Group,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import type { RegisterPayload } from '@/shared/api/types'

const ESPECIALIDADES = [
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
  'Traumatología',
  'Urología',
]

const schema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Ese correo no se ve bien'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    role: z.enum(['patient', 'doctor']),
    phone: z.string().optional(),
    address: z.string().optional(),
    specialty: z.string().optional(),
    licenseNumber: z.string().optional(),
    consultationFee: z.number().min(0).optional(),
    availableHours: z.array(z.string()).optional(),
  })
  .refine((d) => d.role !== 'doctor' || !!d.specialty, {
    message: 'Escoge tu especialidad',
    path: ['specialty'],
  })
  .refine((d) => d.role !== 'doctor' || !!d.licenseNumber, {
    message: 'Falta tu cédula profesional',
    path: ['licenseNumber'],
  })
  .refine((d) => d.role !== 'doctor' || d.consultationFee !== undefined, {
    message: 'Falta el costo de la consulta',
    path: ['consultationFee'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { register: crearCuenta } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient', availableHours: [] },
  })

  const rol = watch('role')

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
      payload.consultationFee = values.consultationFee
      payload.availableHours = values.availableHours ?? []
    }

    try {
      const user = await crearCuenta(payload)
      avisoExito(`Cuenta creada`, `Bienvenido, ${user.name}`)
      navigate('/dashboard')
    } catch (e) {
      avisoError(e, 'No se pudo crear la cuenta')
    }
  }

  return (
    <Center mih="100dvh" px="md" py="xl">
      <Stack gap="lg" w="100%" maw={520}>
        <Stack align="center" gap="xs">
          <ThemeIcon variant="light" color="clinico" size={48} radius="md">
            <Stethoscope size={26} />
          </ThemeIcon>
          <Title order={2}>Crear cuenta</Title>
          <Text size="sm" c="dimmed">
            Para agendar consultas o para recibirlas
          </Text>
        </Stack>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <SegmentedControl
                    fullWidth
                    value={field.value}
                    onChange={field.onChange}
                    data={[
                      { value: 'patient', label: 'Soy paciente' },
                      { value: 'doctor', label: 'Soy doctor' },
                    ]}
                  />
                )}
              />

              <TextInput
                label="Nombre completo"
                placeholder="Ana López"
                error={errors.name?.message}
                {...register('name')}
              />
              <TextInput
                label="Correo"
                placeholder="ana@correo.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <PasswordInput
                label="Contraseña"
                description="Mínimo 8 caracteres"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Group grow align="flex-start">
                <TextInput label="Teléfono" placeholder="5512345678" {...register('phone')} />
                <TextInput label="Ciudad" placeholder="Ciudad de México" {...register('address')} />
              </Group>

              {rol === 'doctor' && (
                <>
                  <Divider label="Datos de tu consultorio" labelPosition="center" />

                  <Controller
                    name="specialty"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Especialidad"
                        placeholder="Escoge una"
                        data={ESPECIALIDADES}
                        searchable
                        value={field.value ?? null}
                        onChange={field.onChange}
                        error={errors.specialty?.message}
                      />
                    )}
                  />

                  <Group grow align="flex-start">
                    <TextInput
                      label="Cédula profesional"
                      placeholder="12345678"
                      error={errors.licenseNumber?.message}
                      {...register('licenseNumber')}
                    />
                    <Controller
                      name="consultationFee"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          label="Costo de consulta"
                          placeholder="1200"
                          prefix="$"
                          thousandSeparator
                          min={0}
                          value={field.value}
                          onChange={(v) => field.onChange(typeof v === 'number' ? v : undefined)}
                          error={errors.consultationFee?.message}
                        />
                      )}
                    />
                  </Group>

                  <Controller
                    name="availableHours"
                    control={control}
                    render={({ field }) => (
                      <TagsInput
                        label="Horarios en que atiendes"
                        description="Escribe una hora y pulsa Enter. Puedes cambiarlos después."
                        placeholder="09:00"
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </>
              )}

              <Button type="submit" fullWidth loading={isSubmitting} mt="xs">
                Crear cuenta
              </Button>
            </Stack>
          </form>
        </Card>

        <Group justify="center" gap={6}>
          <Text size="sm" c="dimmed">
            ¿Ya tienes cuenta?
          </Text>
          <Anchor component={Link} to="/login" size="sm" c="clinico">
            Entra aquí
          </Anchor>
        </Group>
      </Stack>
    </Center>
  )
}
