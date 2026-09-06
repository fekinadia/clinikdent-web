import { useQuery } from '@tanstack/react-query';
import { UserX, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { statisticsApi } from '@/api/endpoints';

// STEP 4 — remplace le placeholder "Bientôt disponible" par une vue
// synthétique réelle de l'automatisation no-show, à partir de
// GET /statistics/automation-overview (réutilise l'architecture de
// statistiques existante plutôt qu'un nouveau sous-système).
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function AutomationOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-overview'],
    queryFn: () => statisticsApi.automationOverview(),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Vue d'ensemble</h1>
        <p className="text-sm text-slate-500 mt-0.5">Automatisation des rendez-vous manqués (no-show)</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<UserX size={22} />}
              label="No-shows"
              value={data?.noShows ?? 0}
              accent="#b91c1c"
            />
            <StatCard
              icon={<Clock size={22} />}
              label="Relances en attente"
              value={data?.relances.enAttente ?? 0}
              accent="#d97706"
            />
            <StatCard
              icon={<CheckCircle2 size={22} />}
              label="Récupérés"
              value={data?.relances.recupere ?? 0}
              accent="#16a34a"
            />
            <StatCard
              icon={<XCircle size={22} />}
              label="Perdus"
              value={data?.relances.perdu ?? 0}
              accent="#64748b"
            />
          </div>
        )}

        <p className="text-xs text-slate-400">
          Rappels et recalls patients : voir les onglets dédiés dans le menu Automatisation.
        </p>
      </div>
    </>
  );
}
