import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { DatesProvider } from '@mantine/dates'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

// Importar el locale solo lo registra. Sin esta línea dayjs sigue formateando
// en inglés y salen cosas como "Friday, 16 de October".
dayjs.locale('es')

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'

import { AuthProvider } from '@/shared/auth/auth-context'
import { theme } from '@/shared/ui/theme'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

// El esquema de color se recuerda por navegador. La clave lleva prefijo para
// no chocar con el token de sesión que vive en el mismo almacenamiento.
const colorSchemeManager = localStorageColorSchemeManager({ key: 'citas-color-scheme' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto" colorSchemeManager={colorSchemeManager}>
      {/* Semana que empieza en lunes y fechas en español, como se leen aquí. */}
      <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1, weekendDays: [0, 6] }}>
        <QueryClientProvider client={queryClient}>
          <ModalsProvider labels={{ confirm: 'Confirmar', cancel: 'Cancelar' }}>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ModalsProvider>
          <Notifications position="top-right" limit={3} />
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
