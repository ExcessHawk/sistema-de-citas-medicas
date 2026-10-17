import { useState } from 'react'
import { Button, Card, Group, Modal, Stack, Select, Text, Textarea } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { CalendarClock, Plus } from 'lucide-react'
import { useCreateFollowUp, useFollowUps } from '../hooks'
import { EmptyState, Loading } from '@/components/common/states'
import { FollowUpStatusBadge } from '@/components/common/status-badge'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { followUpTypeLabel } from '@/shared/lib/format'

const VACIO = { followUpType: 'routine', scheduledDate: '', notes: '' }

export function SeguimientosTab({
  patientId,
  puedeEscribir,
}: {
  patientId: number
  puedeEscribir: boolean
}) {
  const { data, isLoading } = useFollowUps(patientId)
  const crear = useCreateFollowUp(patientId)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)

  const guardar = async () => {
    if (!form.scheduledDate) {
      avisoError(new Error('Falta la fecha del seguimiento'))
      return
    }
    try {
      await crear.mutateAsync({
        patientId,
        followUpType: form.followUpType as never,
        scheduledDate: form.scheduledDate,
        notes: form.notes || undefined,
      })
      avisoExito('Seguimiento agendado')
      setAbierto(false)
      setForm(VACIO)
    } catch (e) {
      avisoError(e, 'No se pudo agendar')
    }
  }

  if (isLoading) return <Loading rows={3} />

  const tipos = Object.entries(followUpTypeLabel).map(([value, label]) => ({ value, label }))

  return (
    <Stack gap="md">
      {puedeEscribir && (
        <Group justify="flex-end">
          <Button size="sm" leftSection={<Plus size={15} />} onClick={() => setAbierto(true)}>
            Nuevo seguimiento
          </Button>
        </Group>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin seguimientos"
          description="Un seguimiento es lo que hay que revisar después de la consulta: un control, un estudio, una llamada."
        />
      ) : (
        <Stack gap="sm">
          {data.map((f) => {
            const cuando = dayjs(f.scheduledDate)
            const vencido = cuando.isBefore(dayjs(), 'day') && f.status === 'scheduled'
            return (
              <Card key={f.id}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600}>{cuando.format('D [de] MMMM [de] YYYY')}</Text>
                    <Text size="sm" c="dimmed">
                      {followUpTypeLabel[f.followUpType] ?? f.followUpType}
                    </Text>
                    {f.notes && (
                      <Text size="sm" mt={6} style={{ whiteSpace: 'pre-line' }}>
                        {f.notes}
                      </Text>
                    )}
                  </div>
                  <Stack gap={6} align="flex-end">
                    <FollowUpStatusBadge status={f.status} />
                    {vencido && (
                      <Text size="xs" c="orange" fw={600}>
                        vencido
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Card>
            )
          })}
        </Stack>
      )}

      <Modal opened={abierto} onClose={() => setAbierto(false)} title="Nuevo seguimiento" centered>
        <Stack gap="md">
          <Select
            label="Tipo"
            data={tipos}
            value={form.followUpType}
            onChange={(v) => setForm({ ...form, followUpType: v ?? 'routine' })}
            allowDeselect={false}
          />
          <DateInput
            label="Fecha programada"
            placeholder="Escoge el día"
            required
            value={form.scheduledDate || null}
            onChange={(v) => setForm({ ...form, scheduledDate: v ?? '' })}
            minDate={new Date()}
          />
          <Textarea
            label="Notas"
            placeholder="Qué hay que revisar y por qué"
            autosize
            minRows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={crear.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
