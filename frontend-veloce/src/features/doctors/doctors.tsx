import { useMemo, useState } from 'react'
import { List, Map as MapIcon, Search, Stethoscope } from 'lucide-react'
import { useDoctors } from './hooks'
import { BookAppointmentDialog } from './book-dialog'
import { DoctorMap } from './doctor-map'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading, EmptyState, ErrorState } from '@/components/common/states'
import type { Doctor } from '@/shared/api/types'

export function DoctorsPage() {
  const { data: doctors, isLoading, isError } = useDoctors()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return doctors ?? []
    return (doctors ?? []).filter(
      (d) =>
        d.name.toLowerCase().includes(q) || (d.specialty ?? '').toLowerCase().includes(q),
    )
  }, [doctors, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctores</h1>
        <p className="text-sm text-muted-foreground">Encuentra un especialista y reserva tu cita</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o especialidad"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            type="button"
            size="sm"
            variant={vista === 'lista' ? 'default' : 'ghost'}
            onClick={() => setVista('lista')}
          >
            <List className="mr-1 size-4" />
            Lista
          </Button>
          <Button
            type="button"
            size="sm"
            variant={vista === 'mapa' ? 'default' : 'ghost'}
            onClick={() => setVista('mapa')}
          >
            <MapIcon className="mr-1 size-4" />
            Mapa
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loading rows={4} />
      ) : isError ? (
        <ErrorState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No se encontraron doctores" />
      ) : vista === 'mapa' ? (
        <DoctorMap doctors={filtered} onBook={setSelected} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">Dr. {d.name}</CardTitle>
                {d.specialty && <Badge variant="secondary">{d.specialty}</Badge>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {d.consultationFee && <p>Consulta: ${d.consultationFee}</p>}
                  {d.phone && <p>Tel: {d.phone}</p>}
                </div>
                <Button className="w-full" onClick={() => setSelected(d)} disabled={!d.specialty}>
                  Reservar cita
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BookAppointmentDialog
        doctor={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  )
}
