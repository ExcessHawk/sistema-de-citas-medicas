import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { patientsApi } from '@/shared/api/endpoints'
import type {
  CreateConditionPayload,
  CreateDocumentPayload,
  CreateFollowUpPayload,
  CreateMedicalHistoryPayload,
} from '@/shared/api/types'

export function useHistory(patientId: number) {
  return useQuery({
    queryKey: ['history', patientId],
    queryFn: () => patientsApi.history(patientId),
  })
}

export function useFollowUps(patientId: number) {
  return useQuery({
    queryKey: ['follow-ups', patientId],
    queryFn: () => patientsApi.followUps(patientId),
  })
}

export function useConditions(patientId: number) {
  return useQuery({
    queryKey: ['conditions', patientId],
    queryFn: () => patientsApi.conditions(patientId),
  })
}

export function useDocuments(patientId: number) {
  return useQuery({
    queryKey: ['documents', patientId],
    queryFn: () => patientsApi.documents(patientId),
  })
}

export function useCreateHistory(patientId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMedicalHistoryPayload) =>
      patientsApi.createHistory(patientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history', patientId] }),
  })
}

export function useCreateFollowUp(patientId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateFollowUpPayload) => patientsApi.createFollowUp(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow-ups', patientId] }),
  })
}

export function useCreateCondition(patientId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateConditionPayload) => patientsApi.createCondition(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conditions', patientId] }),
  })
}

export function useUploadDocumentFile() {
  return useMutation({
    mutationFn: (file: File) => patientsApi.uploadDocumentFile(file),
  })
}

export function useCreateDocument(patientId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDocumentPayload) => patientsApi.createDocument(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', patientId] }),
  })
}
