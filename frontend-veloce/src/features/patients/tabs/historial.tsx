import { useState } from 'react'
import {
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Timeline,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { FileText, Plus, Stethoscope } from 'lucide-react'
import { useCreateHistory, useHistory } from '../hooks'
import { EmptyState, Loading } from '@/components/common/states'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { nombreDoctor } from '@/shared/ui/theme'

const VACIO = {
  visitDate: '',
  nextVisitDate: '',
  symptoms: '',
  diagnosis: '',
  treatment: '',
  medications: '',
  recommendations: '',
}

export function HistorialTab({
  patientId,
  puedeEscribir,
}: {
  patientId: number
  puedeEscribir: boolean
}) {
  const { data, isLoading } = useHistory(patientId)
  const crear = useCreateHistory(patientId)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)

  const guardar = async () => {
    if (!form.visitDate) {
      avisoError(new Error('Falta la fecha de la consulta'))
      return
    }
    try {
      await crear.mutateAsync({
        visitDate: form.visitDate,
        symptoms: form.symptoms || undefined,
        diagnosis: form.diagnosis || undefined,
        treatment: form.treatment || undefined,
        medications: form.medications || undefined,
        recommendations: form.recommendations || undefined,
        nextVisitDate: form.nextVisitDate || undefined,
      })
      avisoExito('Consulta registrada')
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
            Registrar consulta
          </Button>
        </Group>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin consultas registradas"
          description={
            puedeEscribir
              ? 'Cuando atiendas a este paciente, lo que escribas aparecerá aquí en orden.'
              : 'Todavía no hay nada escrito de tus consultas.'
          }
        />
      ) : (
        <Timeline active={data.length} bulletSize={22} lineWidth={2} color="clinico">
          {data.map((e) => (
            <Timeline.Item
              key={e.id}
              bullet={<Stethoscope size={12} />}
              title={dayjs(e.visitDate).format('D [de] MMMM [de] YYYY')}
            >
              {e.doctorName && (
                <Text size="xs" c="dimmed" mb="xs">
                  {nombreDoctor(e.doctorName)}
                </Text>
              )}
              <Card p="sm">
                <Stack gap={8}>
                  {e.symptoms && <Dato etiqueta="Síntomas" valor={e.symptoms} />}
                  {e.diagnosis && <Dato etiqueta="Diagnóstico" valor={e.diagnosis} />}
                  {e.treatment && <Dato etiqueta="Tratamiento" valor={e.treatment} />}
                  {e.medications && <Dato etiqueta="Medicamentos" valor={e.medications} />}
                  {e.recommendations && (
                    <Dato etiqueta="Recomendaciones" valor={e.recommendations} />
                  )}
                  {e.nextVisitDate && (
                    <Dato
                      etiqueta="Próxima visita"
                      valor={dayjs(e.nextVisitDate).format('D [de] MMMM [de] YYYY')}
                    />
                  )}
                </Stack>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      <Modal
        opened={abierto}
        onClose={() => setAbierto(false)}
        title="Registrar una consulta"
        size="lg"
        centered
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <DateInput
              label="Fecha de la consulta"
              placeholder="Escoge el día"
              required
              value={form.visitDate || null}
              onChange={(v) => setForm({ ...form, visitDate: v ?? '' })}
              maxDate={new Date()}
            />
            <DateInput
              label="Próxima visita"
              placeholder="Opcional"
              value={form.nextVisitDate || null}
              onChange={(v) => setForm({ ...form, nextVisitDate: v ?? '' })}
              minDate={new Date()}
            />
          </SimpleGrid>

          <Textarea
            label="Síntomas"
            placeholder="Qué refiere el paciente"
            autosize
            minRows={2}
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.currentTarget.value })}
          />
          <Textarea
            label="Diagnóstico"
            autosize
            minRows={2}
            value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.currentTarget.value })}
          />
          <Textarea
            label="Tratamiento"
            autosize
            minRows={2}
            value={form.treatment}
            onChange={(e) => setForm({ ...form, treatment: e.currentTarget.value })}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Textarea
              label="Medicamentos"
              autosize
              minRows={2}
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.currentTarget.value })}
            />
            <Textarea
              label="Recomendaciones"
              autosize
              minRows={2}
              value={form.recommendations}
              onChange={(e) => setForm({ ...form, recommendations: e.currentTarget.value })}
            />
          </SimpleGrid>

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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {etiqueta}
      </Text>
      <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
        {valor}
      </Text>
    </div>
  )
}
