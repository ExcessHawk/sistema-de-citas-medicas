# Sistema de citas médicas

Agenda clínica: el paciente busca especialista, ve dónde queda el consultorio en
el mapa y reserva; el doctor atiende y registra el historial; el administrador
vigila el conjunto.

Backend en **Bun sobre Veloce-TS** con Drizzle y PostgreSQL. Frontend en **React
19 + Vite** con Mantine, React Query y Leaflet sobre OpenStreetMap.

## Qué hace

**El paciente** se registra, busca por nombre o especialidad, ve los
consultorios en un mapa, reserva un horario libre, consulta sus citas pasadas y
próximas, lee su historial médico y recibe aviso por correo.

**El doctor** se registra con número de cédula, publica sus horarios, atiende lo
agendado, escribe el historial de cada consulta, abre seguimientos y adjunta
documentos: recetas, análisis y radiografías en PDF o imagen.

**El administrador** ve las estadísticas de la clínica y administra usuarios y
doctores.

## Cómo está construido

| | |
|---|---|
| Rutas HTTP | 32, repartidas en 6 controladores |
| Tablas | 7: usuarios, doctores, citas, historial, seguimientos, documentos y padecimientos |
| Autenticación | JWT, con `@Roles` sobre las rutas y comprobación de pertenencia dentro del handler |
| Mapa | Leaflet sobre OpenStreetMap |
| Correo | Nodemailer, con recordatorios diarios a las 08:00 |

Decisiones que vale la pena conocer:

- **Un horario no se puede reservar dos veces.** Un índice único sobre
  `(doctor, fecha, hora)` lo impide en la base, no solo en el código.
- **La pertenencia se comprueba en cada handler**, no solo el rol: un doctor
  tiene rol de doctor, pero eso no lo autoriza a leer la cita de otro.
- **El mapa es Leaflet, no Google Maps.** Google pide llave con facturación
  activa, y esa llave viajaría en el JavaScript del navegador. OpenStreetMap no
  pide nada.
- **Las coordenadas admiten nulo.** Un consultorio sin geocodificar no rompe el
  mapa: no se dibuja, y la interfaz lo dice.

## Levantarlo

```bash
# 1. Base de datos
cd backend-veloce && docker compose up -d

# 2. Backend
cp .env.example .env     # revisa DATABASE_URL y los secretos
bun install
bun run db:migrate
bun run dev              # http://localhost:5000

# 3. Frontend
cd ../frontend-veloce
bun install
bun run dev              # http://localhost:3000
```

La documentación de la API queda en `http://localhost:5000/docs`.

## Demostración pública

Con `DEMO_MODE=true` aparece una puerta de entrada sin contraseña, pensada para
que cualquiera pueda probar la aplicación desde el portafolio.

```bash
bun run demo:seed      # cuentas, 4 doctores geolocalizados, citas e historial
bun run demo:reset     # borra lo que hicieron los visitantes
bun run demo:refresh   # los dos, que es lo que corre el cron cada hora
```

Luego `/demo?rol=paciente`, `?rol=doctor` o `?rol=admin` entra y aterriza en la
pantalla de ese rol.

El sembrado deja **historia, no una base vacía**: citas completadas, una
cancelada y dos próximas, un historial médico con signos vitales y una alergia
registrada. Alguien que entra puede abrir una cita pasada y seguir desde ahí.

### Sobre el bypass de autenticación

`POST /api/demo/session` entrega una sesión **sin pedir contraseña**. Es
intencional, y lleva cuatro candados en dos archivos que tienen que estar de
acuerdo:

1. `DEMO_MODE=true`, apagado por omisión. Apagado, el controlador ni se
   registra: las rutas responden 404, no 403.
2. El correo termina en `@demo.citas.mx`.
3. La fila trae `users.is_demo = true`.
4. `AuthService.signInDemoAccount` repite las comprobaciones 1 y 2 por su
   cuenta.

**Esa base de datos nunca debe tener datos de personas reales.** La cuenta de
administrador de la demostración es administradora de verdad dentro de ella.

`demo:reset` solo toca filas que cuelgan de cuentas `@demo.citas.mx`, se niega a
correr sin `DEMO_MODE`, y aborta si encuentra una cuenta marcada `is_demo` fuera
de ese dominio.

## Pruebas

```bash
bun run dev      # en una terminal
bun run smoke    # en otra
```

21 aserciones contra la API corriendo: los tres roles de demostración, que la
contraseña nunca viaja en una respuesta, que las coordenadas caen en México, que
sin sesión las citas dan 401, que un paciente no entra al panel de
administración y que el historial se lee.

## Lo que falta

- **Sin pruebas de integración contra base real.** Las de humo ejercitan la API
  ya levantada; no hay una suite que monte y tire su propio Postgres.
- **La geocodificación es manual.** Las coordenadas se siembran a mano; no hay
  servicio que convierta una dirección escrita en latitud y longitud.
- **Los recordatorios por correo viven en el proceso.** Un `setTimeout` a las
  08:00; con más de una instancia se mandarían duplicados. En producción irían
  en un cron o una cola.
- **Los documentos médicos guardan ruta, no archivo.** No hay almacenamiento
  todavía.
- **El correo necesita credenciales SMTP.** Sin ellas el registro funciona
  igual, pero nadie recibe aviso.

## Historia

Empezó como un backend en Express con un frontend aparte. El backend está
portado a Veloce-TS (`backend-veloce/`) con Drizzle y control de acceso por rol,
y la API quedó en camelCase de punta a punta. El detalle de la migración está en
`backend-veloce/MIGRATION.md`.
