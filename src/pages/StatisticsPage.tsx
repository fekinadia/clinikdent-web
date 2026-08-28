import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { statisticsApi, StatisticsOverview } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney } from '@/lib/utils';

const PERIODES = [
  { label: '3 mois', value: 3 },
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
];

const NOMS_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatMonthLabel(mois: string) {
  const [y, m] = mois.split('-').map(Number);
  return `${NOMS_MOIS[m - 1]} ${String(y).slice(2)}`;
}

export function StatisticsPage() {
  const [months, setMonths] = useState(6);

  const { data: stats, isLoading } = useQuery<StatisticsOverview>({
    queryKey: ['statistics-overview', months],
    queryFn: () => statisticsApi.overview(months),
  });

  const patientsChartData = useMemo(
    () =>
      stats?.patients.parMois.map((p) => ({
        mois: formatMonthLabel(p.mois),
        'Nouveaux patients': p.nouveaux,
      })) || [],
    [stats],
  );

  const rdvChartData = useMemo(
    () =>
      stats?.rendezVous.parMois.map((r) => ({
        mois: formatMonthLabel(r.mois),
        Confirmés: r.confirme + r.termine,
        'En attente': r.planifie + r.en_cours,
        'Annulés/Absents': r.annule + r.absent,
      })) || [],
    [stats],
  );

  const recettesChartData = useMemo(
    () =>
      stats?.recettes.parMois.map((r) => ({
        mois: formatMonthLabel(r.mois),
        Recettes: r.montant,
      })) || [],
    [stats],
  );

  const nouveauxPatientsPeriode =
    stats?.patients.parMois.reduce((s, p) => s + p.nouveaux, 0) || 0;

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <BarChart3 size={20} className="text-primary-500" />
            Statistiques
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Activité et performance du cabinet</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              onClick={() => setMonths(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                months === p.value ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in space-y-6">
        {isLoading || !stats ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total patients"
                value={stats.patients.total}
                icon={<Users size={18} className="text-blue-600" />}
                color="bg-blue-50"
              />
              <KpiCard
                label={`Nouveaux (${months} mois)`}
                value={nouveauxPatientsPeriode}
                icon={<TrendingUp size={18} className="text-emerald-600" />}
                color="bg-emerald-50"
              />
              <KpiCard
                label="Recettes"
                value={`${formatMoney(stats.recettes.total)} DT`}
                icon={<TrendingUp size={18} className="text-amber-600" />}
                color="bg-amber-50"
              />
              <KpiCard
                label="Taux d'absence"
                value={`${stats.rendezVous.tauxAbsence}%`}
                icon={<AlertTriangle size={18} className="text-rose-600" />}
                color="bg-rose-50"
              />
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4">Nouveaux patients par mois</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={patientsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="Nouveaux patients" fill="#0e6ba8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4">Rendez-vous par mois</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rdvChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Confirmés" stackId="a" fill="#10b981" />
                  <Bar dataKey="En attente" stackId="a" fill="#94a3b8" />
                  <Bar dataKey="Annulés/Absents" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-3">
                Taux de confirmation : {stats.rendezVous.tauxConfirmation}%
              </p>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4">Recettes par mois (DT)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={recettesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="Recettes" stroke="#0e6ba8" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-4">Actes les plus fréquents</h3>
              {stats.actesFrequents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  Aucune donnée sur cette période
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.actesFrequents.map((a, i) => {
                    const max = stats.actesFrequents[0].count;
                    const pct = (a.count / max) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-700">{a.libelle}</span>
                          <span className="text-slate-400 text-xs">{a.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-display font-semibold text-slate-900">{value}</div>
    </div>
  );
}
