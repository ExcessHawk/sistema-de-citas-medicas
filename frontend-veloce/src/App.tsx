import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from '@/shared/auth/guards'
import { AppLayout } from '@/components/layout/app-layout'
import { HomePage } from '@/pages/home'
import { NotFoundPage } from '@/pages/not-found'
import { LoginPage } from '@/features/auth/login'
import { RegisterPage } from '@/features/auth/register'
import { DashboardPage } from '@/features/dashboard/dashboard'
import { DoctorsPage } from '@/features/doctors/doctors'
import { AppointmentsPage } from '@/features/appointments/appointments'
import { ProfilePage } from '@/features/profile/profile'
import { MedicalHistoryPage } from '@/features/patients/medical-history'
import { AdminPage } from '@/features/admin/admin'
import { AgendaPage } from '@/features/agenda/agenda'
import { SchedulePage } from '@/features/schedule/schedule'
import { DemoEntryPage } from '@/features/demo/demo-entry'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      {/* Entrada de la demostración: pide sesión y aterriza según el rol. */}
      <Route path="/demo" element={<DemoEntryPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Authenticated (inside app layout) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Clinician-only */}
          <Route element={<RoleRoute roles={['doctor', 'admin']} />}>
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/patient/:patientId/history" element={<MedicalHistoryPage />} />
          </Route>

          {/* Doctor-only */}
          <Route element={<RoleRoute roles={['doctor']} />}>
            <Route path="/schedule" element={<SchedulePage />} />
          </Route>

          {/* Admin-only */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
