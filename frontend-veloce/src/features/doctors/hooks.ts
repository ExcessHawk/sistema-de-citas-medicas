import { useQuery } from '@tanstack/react-query'
import { doctorsApi } from '@/shared/api/endpoints'

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsApi.list().then((r) => r.doctors),
  })
}

export function useDoctorAvailability(doctorId: number | null, date?: string) {
  return useQuery({
    queryKey: ['availability', doctorId, date],
    queryFn: () => doctorsApi.availability(doctorId as number, date),
    enabled: doctorId != null,
  })
}
