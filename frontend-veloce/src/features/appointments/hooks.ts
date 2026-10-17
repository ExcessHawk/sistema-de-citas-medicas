import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '@/shared/api/endpoints'
import type {
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '@/shared/api/types'

const KEY = ['appointments'] as const

export function useAppointments() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => appointmentsApi.list().then((r) => r.appointments),
  })
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ['appointment-stats'],
    queryFn: () => appointmentsApi.stats().then((r) => r.stats),
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAppointmentPayload) => appointmentsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['appointment-stats'] })
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAppointmentPayload }) =>
      appointmentsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['appointment-stats'] })
    },
  })
}

export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    // Cancelar pasa por update y no por delete: el motivo viaja con el cambio
    // de estado, y DELETE no lleva cuerpo.
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      appointmentsApi.update(id, { status: 'cancelled', cancellationReason: motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['appointment-stats'] })
    },
  })
}
