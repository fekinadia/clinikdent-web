import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PatientsListPage } from '@/pages/PatientsListPage';
import { PatientDetailPage } from '@/pages/PatientDetailPage';
import { AgendaPage } from '@/pages/AgendaPage';
import {
  TreatmentsPage,
  PrescriptionsPage,
  FinancePage,
  StatsPage,
  SettingsPage,
} from '@/pages/PlaceholderPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route
            path="/login"
            element={<PublicRoute><LoginPage /></PublicRoute>}
          />
          <Route
            path="/register"
            element={<PublicRoute><RegisterPage /></PublicRoute>}
          />

          {/* Routes protégées */}
          <Route
            path="/"
            element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
          >
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientsListPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="treatments" element={<TreatmentsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0b1f33',
            color: '#fff',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
