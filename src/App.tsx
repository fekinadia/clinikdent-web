import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen } from '@/components/ui/Spinner';

// Volet perf (2026-09-21) — découpage du bundle par page (React.lazy).
// Avant : tout le routage était importé de façon statique dans ce fichier,
// donc TOUTE l'app (dashboard, patients, agenda, automatisation x6, stats
// avec recharts, guide avec react-pageflip, etc.) partait dans UN SEUL
// fichier JS de ~950 Ko (mesuré via `vite build`, aucun découpage).
// Résultat : à chaque ouverture/rechargement de l'app, le navigateur doit
// télécharger + parser + exécuter ce bloc entier avant que quoi que ce soit
// ne s'affiche — d'où la sensation d'app "lourde", surtout sur connexion
// mobile. Avec React.lazy, chaque page devient son propre petit fichier,
// chargé uniquement quand on la visite pour la première fois (et mis en
// cache par le navigateur ensuite).
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PatientsListPage = lazy(() => import('@/pages/PatientsListPage').then((m) => ({ default: m.PatientsListPage })));
const PatientDetailPage = lazy(() => import('@/pages/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })));
const AgendaPage = lazy(() => import('@/pages/AgendaPage').then((m) => ({ default: m.AgendaPage })));
const GuidePage = lazy(() => import('@/pages/GuidePage').then((m) => ({ default: m.GuidePage })));
const RecallsPage = lazy(() => import('@/pages/RecallsPage').then((m) => ({ default: m.RecallsPage })));
const AutomationOverviewPage = lazy(() => import('@/pages/automation/AutomationOverviewPage').then((m) => ({ default: m.AutomationOverviewPage })));
const AutomationRemindersPage = lazy(() => import('@/pages/automation/AutomationRemindersPage').then((m) => ({ default: m.AutomationRemindersPage })));
const AutomationNoShowsPage = lazy(() => import('@/pages/automation/AutomationNoShowsPage').then((m) => ({ default: m.AutomationNoShowsPage })));
const AutomationRecallsPage = lazy(() => import('@/pages/automation/AutomationRecallsPage').then((m) => ({ default: m.AutomationRecallsPage })));
const AutomationWhatsAppPage = lazy(() => import('@/pages/automation/AutomationWhatsAppPage').then((m) => ({ default: m.AutomationWhatsAppPage })));
const AutomationHistoryPage = lazy(() => import('@/pages/automation/AutomationHistoryPage').then((m) => ({ default: m.AutomationHistoryPage })));
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const PrescriptionsPage = lazy(() => import('@/pages/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));
const TreatmentsPage = lazy(() => import('@/pages/PlaceholderPages').then((m) => ({ default: m.TreatmentsPage })));
const SettingsPage = lazy(() => import('@/pages/PlaceholderPages').then((m) => ({ default: m.SettingsPage })));
const FinancePage = lazy(() => import('@/pages/FinancePage').then((m) => ({ default: m.FinancePage })));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const DemoAccountsPage = lazy(() => import('@/pages/admin/DemoAccountsPage').then((m) => ({ default: m.DemoAccountsPage })));
const AllAccountsPage = lazy(() => import('@/pages/admin/AllAccountsPage').then((m) => ({ default: m.AllAccountsPage })));

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
        <Suspense fallback={<LoadingScreen />}>
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
              <Route path="guide" element={<GuidePage />} />
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
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="stats" element={<StatisticsPage />} />
              <Route path="parametres/abonnement" element={<SubscriptionPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin/demo-accounts" element={<DemoAccountsPage />} />
              <Route path="admin/accounts" element={<AllAccountsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
