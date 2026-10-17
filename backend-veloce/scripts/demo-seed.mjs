/**
 * Siembra el mundo de la demostración: cuentas, doctores geolocalizados,
 * pacientes y citas en varios estados.
 *
 * Deja historia, no una base vacía. Alguien que entra tiene que poder abrir una
 * cita pasada, ver su historial y seguir desde ahí.
 *
 *   bun run demo:seed
 */
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

const DOMAIN = '@demo.citas.mx'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demostracion-larga-de-prueba-4471'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL. Corre con bun, que lee el .env solo.')
  process.exit(1)
}

const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

const q = async (sql, params = []) => (await client.query(sql, params)).rows

const hash = await bcrypt.hash(PASSWORD, 10)

console.log('Sembrando la demostración')
console.log(`  base: ${DATABASE_URL.replace(/:\/\/[^@]*@/, '://***@')}`)

// ── cuentas ───────────────────────────────────────────────────────────────────

async function cuenta(email, name, role) {
  const [existe] = await q('SELECT id FROM users WHERE email = $1', [email])
  if (existe) {
    await q('UPDATE users SET is_demo = true, name = $2, role = $3 WHERE id = $1', [
      existe.id,
      name,
      role,
    ])
    return existe.id
  }
  const [creado] = await q(
    `INSERT INTO users (name, email, password, role, is_demo)
          VALUES ($1, $2, $3, $4, true) RETURNING id`,
    [name, email, hash, role],
  )
  return creado.id
}

const pacienteId = await cuenta(`paciente${DOMAIN}`, 'Dani Ruiz', 'patient')
const adminId = await cuenta(`admin${DOMAIN}`, 'Equipo de la clínica', 'admin')

// Coordenadas reales de la Ciudad de México, para que el mapa tenga sentido.
const DOCTORES = [
  {
    email: `doctor${DOMAIN}`,
    name: 'Dra. María González',
    specialty: 'Cardiología',
    licenseNumber: 'DEMO-CARD-001',
    phone: '5512345678',
    address: 'Av. Insurgentes Sur 1457, Insurgentes Mixcoac, CDMX',
    latitude: 19.375_6,
    longitude: -99.187_4,
    consultationFee: 1600,
    availableHours: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00'],
  },
  {
    email: `dermatologia${DOMAIN}`,
    name: 'Dr. Carlos Rodríguez',
    specialty: 'Dermatología',
    licenseNumber: 'DEMO-DERM-001',
    phone: '5523456789',
    address: 'Paseo de la Reforma 505, Cuauhtémoc, CDMX',
    latitude: 19.427_0,
    longitude: -99.175_6,
    consultationFee: 1400,
    availableHours: ['09:00', '10:00', '11:00', '15:00', '16:00'],
  },
  {
    email: `pediatria${DOMAIN}`,
    name: 'Dra. Ana Martínez',
    specialty: 'Pediatría',
    licenseNumber: 'DEMO-PED-001',
    phone: '5534567890',
    address: 'Av. Universidad 1200, Del Valle, CDMX',
    latitude: 19.365_9,
    longitude: -99.167_2,
    consultationFee: 1200,
    availableHours: ['08:00', '09:00', '10:00', '11:00', '17:00'],
  },
  {
    email: `traumatologia${DOMAIN}`,
    name: 'Dr. Jorge Herrera',
    specialty: 'Traumatología',
    licenseNumber: 'DEMO-TRAU-001',
    phone: '5545678901',
    address: 'Calz. de Tlalpan 4800, Tlalpan, CDMX',
    latitude: 19.292_1,
    longitude: -99.145_3,
    consultationFee: 1800,
    availableHours: ['10:00', '11:00', '12:00', '16:00'],
  },
]

const doctorUserIds = {}
for (const doc of DOCTORES) {
  const userId = await cuenta(doc.email, doc.name, 'doctor')
  doctorUserIds[doc.email] = userId

  const [perfil] = await q('SELECT id FROM doctors WHERE user_id = $1', [userId])
  if (perfil) {
    await q(
      `UPDATE doctors
          SET specialty = $2, license_number = $3, phone = $4, address = $5,
              latitude = $6, longitude = $7, consultation_fee = $8,
              available_hours = $9::jsonb, updated_at = now()
        WHERE id = $1`,
      [
        perfil.id,
        doc.specialty,
        doc.licenseNumber,
        doc.phone,
        doc.address,
        doc.latitude,
        doc.longitude,
        doc.consultationFee,
        JSON.stringify(doc.availableHours),
      ],
    )
  } else {
    await q(
      `INSERT INTO doctors (user_id, specialty, license_number, phone, address,
                            latitude, longitude, consultation_fee, available_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        userId,
        doc.specialty,
        doc.licenseNumber,
        doc.phone,
        doc.address,
        doc.latitude,
        doc.longitude,
        doc.consultationFee,
        JSON.stringify(doc.availableHours),
      ],
    )
  }
}
console.log(`  ${DOCTORES.length} doctores con coordenadas`)

// ── citas ─────────────────────────────────────────────────────────────────────

const dia = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const cardiologo = doctorUserIds[`doctor${DOMAIN}`]
const dermatologo = doctorUserIds[`dermatologia${DOMAIN}`]
const pediatra = doctorUserIds[`pediatria${DOMAIN}`]

const CITAS = [
  { doctorId: cardiologo, date: dia(-30), time: '10:00', status: 'completed', notes: 'Revisión anual. Presión en rango.' },
  { doctorId: dermatologo, date: dia(-14), time: '16:00', status: 'completed', notes: 'Control de lunar en el antebrazo.' },
  { doctorId: pediatra, date: dia(-7), time: '09:00', status: 'cancelled', notes: 'Cancelada por el paciente.' },
  { doctorId: cardiologo, date: dia(3), time: '11:00', status: 'confirmed', notes: 'Seguimiento de electrocardiograma.' },
  { doctorId: dermatologo, date: dia(9), time: '09:00', status: 'scheduled', notes: null },
]

let nuevas = 0
for (const cita of CITAS) {
  const [existe] = await q(
    `SELECT id FROM appointments
      WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date = $3 AND appointment_time = $4`,
    [pacienteId, cita.doctorId, cita.date, cita.time],
  )
  if (existe) continue
  await q(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6)`,
    [pacienteId, cita.doctorId, cita.date, cita.time, cita.status, cita.notes],
  )
  nuevas += 1
}
console.log(`  ${nuevas} citas nuevas (${CITAS.length} en total: pasadas, cancelada y próximas)`)

// ── historial médico ──────────────────────────────────────────────────────────

const [historial] = await q('SELECT id FROM patient_medical_history WHERE patient_id = $1 LIMIT 1', [
  pacienteId,
])
if (!historial) {
  await q(
    `INSERT INTO patient_medical_history
       (patient_id, doctor_id, visit_date, symptoms, diagnosis, treatment,
        medications, vital_signs, recommendations, next_visit_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
    [
      pacienteId,
      cardiologo,
      dia(-30),
      'Dolor de cabeza ocasional al final del día.',
      'Hipertensión arterial leve',
      'Dieta baja en sodio y caminata diaria de 30 minutos.',
      'Ninguno por ahora.',
      JSON.stringify({ presion: '138/88', pulso: 76, peso: 74.5 }),
      'Volver a medir en tres meses.',
      dia(60),
    ],
  )
  console.log('  historial médico sembrado')
}

const [padecimiento] = await q('SELECT id FROM patient_conditions WHERE patient_id = $1 LIMIT 1', [
  pacienteId,
])
if (!padecimiento) {
  await q(
    `INSERT INTO patient_conditions
       (patient_id, condition_type, name, description, severity, diagnosis_date, is_active)
     VALUES ($1, 'allergy', 'Penicilina', $3, 'moderate', $2, true)`,
    [pacienteId, dia(-2000), 'Erupción cutánea documentada en 2019.'],
  )
  console.log('  padecimiento sembrado')
}

console.log('')
console.log('Listo. Cuentas de demostración:')
console.log(`  paciente   paciente${DOMAIN}`)
console.log(`  doctor     doctor${DOMAIN}`)
console.log(`  admin      admin${DOMAIN}`)
console.log('')
console.log('La contraseña no se usa desde el portafolio: POST /api/demo/session entrega la sesión.')
console.log('Ese endpoint solo existe cuando DEMO_MODE=true.')

await client.end()
