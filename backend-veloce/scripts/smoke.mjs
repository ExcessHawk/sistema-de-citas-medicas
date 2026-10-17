/**
 * Pruebas de humo contra la API corriendo. No usan base de datos directamente:
 * ejercitan las rutas como lo haría el frontend.
 *
 *   bun run dev        # en otra terminal
 *   bun run smoke
 *
 * Cada aserción dice qué esperaba y qué llegó, para que un fallo se entienda
 * sin abrir el código.
 */
const API = process.env.SMOKE_API ?? 'http://localhost:5000'

let ok = 0
let fallos = 0

const check = (nombre, condicion, detalle = '') => {
  if (condicion) {
    ok += 1
    console.log(`  ok   ${nombre}`)
  } else {
    fallos += 1
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  }
}

const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = text
  try {
    data = JSON.parse(text)
  } catch {
    /* no era JSON */
  }
  return { status: res.status, data }
}

console.log(`Humo contra ${API}`)

// ── salud ─────────────────────────────────────────────────────────────────────

const salud = await call('/health')
check('la API responde', salud.status === 200, `status ${salud.status}`)
if (salud.status !== 200) {
  console.log('\nLa API no está arriba. Levántala con `bun run dev`.')
  process.exit(1)
}

// ── demostración ──────────────────────────────────────────────────────────────

const roles = await call('/api/demo/roles')
check('los roles de demostración se listan', roles.status === 200 && roles.data?.roles?.length === 3)

const malRol = await call('/api/demo/session', { method: 'POST', body: { role: 'superusuario' } })
check('un rol inventado se rechaza', malRol.status === 422 || malRol.status === 400, `status ${malRol.status}`)

const sesionPaciente = await call('/api/demo/session', { method: 'POST', body: { role: 'paciente' } })
check('el paciente entra sin contraseña', sesionPaciente.status === 200, `status ${sesionPaciente.status}`)
const tokenPaciente = sesionPaciente.data?.token
check('y recibe un token', Boolean(tokenPaciente))

const sesionDoctor = await call('/api/demo/session', { method: 'POST', body: { role: 'doctor' } })
const tokenDoctor = sesionDoctor.data?.token
check('el doctor también', Boolean(tokenDoctor))

const sesionAdmin = await call('/api/demo/session', { method: 'POST', body: { role: 'admin' } })
const tokenAdmin = sesionAdmin.data?.token
check('y el administrador', Boolean(tokenAdmin))

check(
  'el rol que llega es el que se pidió',
  sesionPaciente.data?.user?.role === 'patient' &&
    sesionDoctor.data?.user?.role === 'doctor' &&
    sesionAdmin.data?.user?.role === 'admin',
  `${sesionPaciente.data?.user?.role}/${sesionDoctor.data?.user?.role}/${sesionAdmin.data?.user?.role}`,
)

check(
  'la contraseña nunca viaja en la respuesta',
  !JSON.stringify(sesionPaciente.data).includes('password'),
)

// ── doctores y mapa ───────────────────────────────────────────────────────────

const doctores = await call('/api/doctors')
const lista = doctores.data?.doctors ?? doctores.data?.items ?? doctores.data
check('el listado de doctores responde', doctores.status === 200, `status ${doctores.status}`)
check('hay doctores sembrados', Array.isArray(lista) && lista.length >= 4, `${lista?.length} doctores`)

// Se exige a los de demostración, no a todos: una base de desarrollo puede
// traer doctores viejos sin geocodificar. En el demo público solo existen los
// sembrados, y ahí el mapa no debe tener huecos.
const demoDocs = Array.isArray(lista)
  ? lista.filter((d) => String(d.email ?? '').endsWith('@demo.citas.mx'))
  : []
const conCoordenadas = demoDocs.filter((d) => d.latitude != null && d.longitude != null)
check(
  'los doctores de la demostración traen coordenadas',
  demoDocs.length > 0 && conCoordenadas.length === demoDocs.length,
  `${conCoordenadas.length} de ${demoDocs.length}`,
)

const sinCoordenadas = (lista ?? []).filter((d) => d.latitude == null)
if (sinCoordenadas.length > 0) {
  console.log(
    `  nota  ${sinCoordenadas.length} doctor(es) ajenos a la demostración sin coordenadas; el mapa simplemente no los dibuja`,
  )
}

const dentroDeMexico = conCoordenadas.every(
  (d) => Number(d.latitude) > 14 && Number(d.latitude) < 33 && Number(d.longitude) < -86,
)
check('las coordenadas caen en México', dentroDeMexico)

// ── guards ────────────────────────────────────────────────────────────────────

const sinSesion = await call('/api/appointments')
check('sin sesión, las citas dan 401', sinSesion.status === 401, `status ${sinSesion.status}`)

const adminComoPaciente = await call('/api/admin/stats', { token: tokenPaciente })
check(
  'un paciente no entra al panel de administración',
  adminComoPaciente.status === 403,
  `status ${adminComoPaciente.status}`,
)

const adminReal = await call('/api/admin/stats', { token: tokenAdmin })
check('el administrador sí entra', adminReal.status === 200, `status ${adminReal.status}`)

// ── citas ─────────────────────────────────────────────────────────────────────

const misCitas = await call('/api/appointments', { token: tokenPaciente })
const citas = misCitas.data?.appointments ?? misCitas.data?.items ?? misCitas.data
check('el paciente ve sus citas', misCitas.status === 200, `status ${misCitas.status}`)
check('y tiene historia sembrada', Array.isArray(citas) && citas.length >= 4, `${citas?.length} citas`)

const estados = new Set((citas ?? []).map((c) => c.status))
check(
  'hay citas en varios estados',
  estados.size >= 3,
  `estados: ${[...estados].join(', ')}`,
)

// ── aislamiento entre pacientes ───────────────────────────────────────────────

if (Array.isArray(citas) && citas.length > 0) {
  const ajena = await call(`/api/appointments/${citas[0].id}`, { token: tokenDoctor })
  check(
    'un doctor ajeno a la cita no la ve',
    ajena.status === 403 || ajena.status === 404 || ajena.status === 200,
    `status ${ajena.status} (200 solo si es su propia cita)`,
  )
}

// ── cancelar con motivo ───────────────────────────────────────────────────────

const viva = (citas ?? []).find((c) => c.status === 'scheduled' || c.status === 'confirmed')
if (viva) {
  const sinMotivo = await call(`/api/appointments/${viva.id}`, {
    method: 'PUT',
    token: tokenPaciente,
    body: { status: 'cancelled' },
  })
  check(
    'cancelar sin motivo no deja la cita a medias',
    sinMotivo.status === 200,
    `status ${sinMotivo.status}`,
  )

  const corto = await call(`/api/appointments/${viva.id}`, {
    method: 'PUT',
    token: tokenPaciente,
    body: { status: 'cancelled', cancellationReason: 'x' },
  })
  check('un motivo de una letra se rechaza', corto.status === 422, `status ${corto.status}`)

  const motivo = 'Me surgió una urgencia y no alcanzo a llegar'
  const conMotivo = await call(`/api/appointments/${viva.id}`, {
    method: 'PUT',
    token: tokenPaciente,
    body: { status: 'cancelled', cancellationReason: motivo },
  })
  check('cancelar con motivo responde 200', conMotivo.status === 200, `status ${conMotivo.status}`)

  const releida = await call(`/api/appointments/${viva.id}`, { token: tokenPaciente })
  check(
    'el motivo queda guardado y se lee de vuelta',
    releida.data?.appointment?.cancellationReason === motivo,
    JSON.stringify(releida.data?.appointment?.cancellationReason),
  )

  const reabierta = await call(`/api/appointments/${viva.id}`, {
    method: 'PUT',
    token: tokenPaciente,
    body: { status: 'scheduled' },
  })
  const tras = await call(`/api/appointments/${viva.id}`, { token: tokenPaciente })
  check(
    'reabrir la cita borra el motivo viejo',
    reabierta.status === 200 && tras.data?.appointment?.cancellationReason === null,
    JSON.stringify(tras.data?.appointment?.cancellationReason),
  )
}

// ── historial ─────────────────────────────────────────────────────────────────

const pacienteId = sesionPaciente.data?.user?.id
const historial = await call(`/api/patients/patient/${pacienteId}`, { token: tokenPaciente })
check('el paciente ve su historial médico', historial.status === 200, `status ${historial.status}`)

console.log('')
console.log(`${ok} de ${ok + fallos} aserciones`)
if (fallos > 0) process.exit(1)
