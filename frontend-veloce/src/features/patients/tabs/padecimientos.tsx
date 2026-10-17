import { useState } from 'react'
import { Badge, Button, Card, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { Activity, Plus } from 'lucide-react'
import { useConditions, useCreateCondition } from '../hooks'
import { EmptyState, Loading } from '@/components/common/states'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { conditionTypeLabel, severityLabel } from '@/shared/lib/format'

const VACIO = {
  conditionType: 'allergy',
  name: '',
  description: '',
  severity: '',
  diagnosisDate: '',
}

const COLOR_GRAVEDAD: Record<string, string> = {
  mild: 'yellow',
  moderate: 'orange',
  severe: 'red',
}

export function PadecimientosTab({
  patientId,
  puedeEscribir,
}: {
  patientId: number
  puedeEscribir: boolean
}) {
  const { data, isLoading } = useConditions(patientId)
  const crear = useCreateCondition(patientId)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)

  const guardar = async () => {
    if (!form.name.trim()) {
      avisoError(new Error('Falta el nombre del padecimiento'))
      return
    }
    try {
      await crear.mutateAsync({
        patientId,
        conditionType: form.conditionType as never,
        name: form.name.trim(),
        description: form.description || undefined,
        severity: (form.severity || undefined) as never,
        diagnosisDate: form.diagnosisDate || undefined,
      })
      avisoExito('Padecimiento registrado')
      setAbierto(false)
      setForm(VACIO)
    } catch (e) {
      avisoError(e, 'No se pudo registrar')
    }
  }

  if (isLoading) return <Loading rows={3} />

  return (
    <Stack gap="md">
      {puedeEscribir && (
        <Group justify="flex-end">
          <Button size="sm" leftSection={<Plus size={15} />} onClick={() => setAbierto(true)}>
            Agregar padecimiento
          </Button>
        </Group>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Sin padecimientos registrados"
          description="Alergias, enfermedades crónicas, cirugías: lo que cualquier doctor debería saber antes de recetar."
        />
      ) : (
        <Stack gap="sm">
          {data.map((c) => (
            <Card key={c.id}>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text fw={600}>{c.name}</Text>
                    <Badge size="sm" variant="light" color="gray">
                      {conditionTypeLabel[c.conditionType] ?? c.conditionType}
                    </Badge>
                    {c.severity && (
                      <Badge size="sm" variant="light" color={COLOR_GRAVEDAD[c.severity] ?? 'gray'}>
                        {severityLabel[c.severity] ?? c.severity}
                      </Badge>
                    )}
                  </Group>
                  {c.description && (
                    <Text size="sm" c="dimmed" mt={6} style={{ whiteSpace: 'pre-line' }}>
                      {c.description}
                    </Text>
                  )}
                </div>
                {c.diagnosisDate && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    desde {dayjs(c.diagnosisDate).format('MMM YYYY')}
                  </Text>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal
        opened={abierto}
        onClose={() => setAbierto(false)}
        title="Agregar padecimiento"
        centered
      >
        <Stack gap="md">
          <Select
            label="Tipo"
            data={Object.entries(conditionTypeLabel).map(([value, label]) => ({ value, label }))}
            value={form.conditionType}
            onChange={(v) => setForm({ ...form, conditionType: v ?? 'allergy' })}
            allowDeselect={false}
          />
          <TextInput
            label="Nombre"
            placeholder="Penicilina, diabetes tipo 2, apendicectomía…"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <Group grow align="flex-start">
            <Select
              label="Gravedad"
              placeholder="Opcional"
              data={Object.entries(severityLabel).map(([value, label]) => ({ value, label }))}
              value={form.severity || null}
              onChange={(v) => setForm({ ...form, severity: v ?? '' })}
              clearable
            />
            <DateInput
              label="Diagnosticado"
              placeholder="Opcional"
              value={form.diagnosisDate || null}
              onChange={(v) => setForm({ ...form, diagnosisDate: v ?? '' })}
              maxDate={new Date()}
            />
          </Group>
          <Textarea
            label="Detalle"
            placeholder="Cómo se manifiesta, qué lo desencadena, qué se ha intentado"
            autosize
            minRows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
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
