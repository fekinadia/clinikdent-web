import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PatientsListPage } from '@/pages/PatientsListPage';
import { PatientDetailPage } from '@/pages/PatientDetailPage';
import { AgendaPage } from '@/pages/AgendaPage';
import { RecallsPage } from '@/pages/RecallsPage';
import { AutomationOverviewPage } from '@/pages/automation/AutomationOverviewPage';
import { AutomationRemindersPage } from '@/pages/automation/AutomationRemindersPage';
import { AutomationNoShowsPage } from '@/pages/automation/AutomationNoShowsPage';
import { AutomationRecallsPage } from '@/pages/automation/AutomationRecallsPage';
import { AutomationWhatsAppPage } from '@/pages/automation/AutomationWhatsAppPage';
import { AutomationHistoryPage } from '@/pages/automation/AutomationHistoryPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { PrescriptionsPage } from '@/pages/PrescriptionsPage';
import { TreatmentsPage, SettingsPage } from '@/pages/PlaceholderPages';
import { FinancePage } from '@/pages/FinancePage';
import { DemoAccountsPage } from '@/pages/admin/DemoAccountsPage';
import { AllAccountsPage } from '@/pages/admin/AllAccountsPage';

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

          {/* Routes protégées */}
          <Route
            path="/"
            element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
          >
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientsListPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="recalls" element={<RecallsPage />} />
            <Route path="automatisation" element={<AutomationOverviewPage />} />
            <Route path="automatisation/rappels" element={<AutomationRemindersPage />} />
            <Route path="automatisation/no-shows" element={<AutomationNoShowsPage />} />
            <Route path="automatisation/recalls" element={<AutomationRecallsPage />} />
            <Route path="automatisation/whatsapp" element={<AutomationWhatsAppPage />} />
            <Route path="automatisation/historique" element={<AutomationHistoryPage />} />
            <Route path="treatments" element={<TreatmentsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="stats" element={<StatisticsPage />} />
            <Route path="parametres/abonnement" element={<SubscriptionPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin/demo-accounts" element={<DemoAccountsPage />} />
            <Route path="admin/accounts" element={<AllAccountsPage />} />
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
