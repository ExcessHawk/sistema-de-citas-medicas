/**
 * Mapa de consultorios.
 *
 * Leaflet sobre OpenStreetMap, no Google Maps: no pide llave de API ni
 * facturación, y una llave de Google viajaría en el JavaScript del navegador.
 *
 * Los doctores sin coordenadas simplemente no se dibujan, y el componente lo
 * dice en vez de callárselo.
 */
import { useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Doctor } from '@/shared/api/types'
import { Button, Paper, Stack, Text } from '@mantine/core'
import { nombreDoctor } from '@/shared/ui/theme'

// Leaflet trae sus iconos como rutas relativas que el bundler no resuelve, así
// que el marcador se dibuja en SVG y se acabó el problema.
const marcador = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 22 14 22s14-12 14-22c0-7.7-6.3-14-14-14z" fill="#0f766e"/>
    <circle cx="14" cy="14" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
})

type Props = {
  doctors: Doctor[]
  onBook?: (doctor: Doctor) => void
}

export function DoctorMap({ doctors, onBook }: Props) {
  const conUbicacion = useMemo(
    () =>
      doctors
        .map((d) => ({
          doctor: d,
          lat: d.latitude === null ? null : Number(d.latitude),
          lng: d.longitude === null ? null : Number(d.longitude),
        }))
        .filter(
          (x): x is { doctor: Doctor; lat: number; lng: number } =>
            x.lat !== null && x.lng !== null && !Number.isNaN(x.lat) && !Number.isNaN(x.lng),
        ),
    [doctors],
  )

  const centro = useMemo<[number, number]>(() => {
    if (conUbicacion.length === 0) return [19.4326, -99.1332]
    const lat = conUbicacion.reduce((s, x) => s + x.lat, 0) / conUbicacion.length
    const lng = conUbicacion.reduce((s, x) => s + x.lng, 0) / conUbicacion.length
    return [lat, lng]
  }, [conUbicacion])

  const sinUbicacion = doctors.length - conUbicacion.length

  if (conUbicacion.length === 0) {
    return (
      <Paper h={288} withBorder radius="md" style={{ display: 'grid', placeItems: 'center' }}>
        <Text size="sm" c="dimmed">
          Ningún consultorio tiene ubicación registrada todavía.
        </Text>
      </Paper>
    )
  }

  return (
    <Stack gap="xs">
      <Paper h={360} withBorder radius="md" style={{ overflow: 'hidden' }}>
        <MapContainer
          center={centro}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          aria-label="Mapa de consultorios"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {conUbicacion.map(({ doctor, lat, lng }) => (
            <Marker key={doctor.id} position={[lat, lng]} icon={marcador}>
              <Popup>
                <div style={{ display: 'grid', gap: 4 }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>{nombreDoctor(doctor.name)}</p>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{doctor.specialty}</p>
                  <p style={{ margin: 0, fontSize: 12 }}>{doctor.address}</p>
                  {doctor.consultationFee && (
                    <p style={{ margin: 0, fontSize: 12 }}>
                      Consulta: ${Number(doctor.consultationFee).toLocaleString('es-MX')} MXN
                    </p>
                  )}
                  {onBook && (
                    <Button size="xs" fullWidth mt={6} onClick={() => onBook(doctor)}>
                      Agendar
                    </Button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Paper>

      {sinUbicacion > 0 && (
        <Text size="xs" c="dimmed">
          {sinUbicacion} consultorio{sinUbicacion === 1 ? '' : 's'} sin ubicación registrada
          {sinUbicacion === 1 ? ' no aparece' : ' no aparecen'} en el mapa.
        </Text>
      )}
    </Stack>
  )
}
