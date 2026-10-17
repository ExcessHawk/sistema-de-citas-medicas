/**
 * Borra lo que hicieron los visitantes y deja la demostración como recién
 * sembrada. Es lo que corre el cron cada hora, junto con demo:seed.
 *
 * Solo toca filas que cuelgan de cuentas @demo.citas.mx, se niega a correr sin
 * DEMO_MODE, y aborta si encuentra una cuenta marcada is_demo fuera de ese
 * dominio — eso significaría que alguien marcó a una persona real.
 *
 *   bun run demo:reset
 */
import { Client } from 'pg'

const DOMAIN = '@demo.citas.mx'
const FORCE = process.argv.includes('--force')

if (process.env.DEMO_MODE !== 'true' && !FORCE) {
  console.error('DEMO_MODE no está en true. Este script solo corre contra la base de demostración.')
  console.error('Si de verdad quieres correrlo aquí, pasa --force.')
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL. Corre con bun, que lee el .env solo.')
  process.exit(1)
}

const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

const q = async (sql, params = []) => (await client.query(sql, params)).rows
const uno = async (sql, params = []) => {
  const rows = await q(sql, params)
  return rows.length ? String(Object.values(rows[0])[0] ?? '') : ''
}

const cuantas = await uno(
  'SELECT count(*) FROM users WHERE email LIKE $1 AND is_demo = true',
  [`%${DOMAIN}`],
)
if (cuantas === '0') {
  console.error('No hay cuentas de demostración. Siembra primero con demo:seed.')
  process.exit(1)
}

const intrusas = await uno('SELECT count(*) FROM users WHERE is_demo = true AND email NOT LIKE $1', [
  `%${DOMAIN}`,
])
if (intrusas !== '0') {
  console.error(`${intrusas} cuenta(s) marcadas is_demo fuera del dominio de demostración.`)
  console.error('Eso no debería pasar. Revísalas antes de borrar nada.')
  process.exit(1)
}

console.log(`Reiniciando la demostración (${cuantas} cuentas)`)

const demoUsers = `(SELECT id FROM users WHERE email LIKE '%${DOMAIN}' AND is_demo = true)`

const pasos = [
  ['documentos médicos', `DELETE FROM medical_documents WHERE patient_id IN ${demoUsers}`],
  ['seguimientos', `DELETE FROM medical_follow_ups WHERE patient_id IN ${demoUsers}`],
  ['padecimientos', `DELETE FROM patient_conditions WHERE patient_id IN ${demoUsers}`],
  ['historial médico', `DELETE FROM patient_medical_history WHERE patient_id IN ${demoUsers}`],
  [
    'citas',
    `DELETE FROM appointments WHERE patient_id IN ${demoUsers} OR doctor_id IN ${demoUsers}`,
  ],
  [
    'cuentas que creó un visitante',
    `DELETE FROM users WHERE is_demo = false AND email LIKE '%${DOMAIN}'`,
  ],
]

for (const [etiqueta, sql] of pasos) {
  await q(sql)
  console.log(`  limpio: ${etiqueta}`)
}

console.log('')
console.log('Listo. Corre demo:seed para volver a poblarla.')

await client.end()
