import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Calendar, TrendingUp, AlertCircle, ArrowRight, Wallet, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { patientsApi, appointmentsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatTime } from '@/lib/utils';

const STATUT_STYLE: Record<string, { border: string; bg: string; text: string; label: string }> = {
  planifie: { border: '#94a3b8', bg: '#94a3b81a', text: '#475569', label: 'Planifié' },
  confirme: { border: '#0e6ba8', bg: '#0e6ba81a', text: '#0e6ba8', label: 'Confirmé' },
  en_cours: { border: '#d97706', bg: '#d977061a', text: '#b45309', label: 'En cours' },
  termine: { border: '#16a34a', bg: '#16a34a1a', text: '#15803d', label: 'Terminé' },
  annule: { border: '#e11d48', bg: '#e11d481a', text: '#be123c', label: 'Annulé' },
  absent: { border: '#64748b', bg: '#64748b1a', text: '#475569', label: 'Absent' },
  no_show: { border: '#b91c1c', bg: '#b91c1c1a', text: '#991b1b', label: 'No-show' },
};

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['patients-stats'],
    queryFn: patientsApi.stats,
  });

  const { data: todayAppts, isLoading } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: appointmentsApi.today,
  });

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Tableau de bord</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{today}</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Patients aujourd'hui"
            value={todayAppts?.length ?? '—'}
            icon={<Users size={20} />}
            tint="#0e6ba8"
          />
          <StatCard
            label="Total patients"
            value={stats?.total ?? '—'}
            icon={<Users size={20} />}
            tint="#16a34a"
          />
          <StatCard
            label="Nouveaux ce mois"
            value={stats?.ceMois ?? '—'}
            icon={<TrendingUp size={20} />}
            tint="#d97706"
          />
          <StatCard
            label="Alertes"
            value="0"
            icon={<AlertCircle size={20} />}
            tint="#e11d48"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Aujourd'hui */}
          <div className="card p-5 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar size={18} className="text-primary-500" />
                Rendez-vous du jour
              </h3>
              <Link to="/agenda" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
                Voir l'agenda <ArrowRight size={12} />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12"><Spinner /></div>
            ) : todayAppts?.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-500">
                Aucun rendez-vous aujourd'hui 😌
              </p>
            ) : (
              <div className="space-y-2">
                {todayAppts?.map((appt) => {
                  const s = STATUT_STYLE[appt.statut] ?? STATUT_STYLE.planifie;
                  return (
                    <Link
                      key={appt.id}
                      to={`/patients/${appt.patientId}`}
                      className="flex items-center gap-3 p-3 rounded-xl border-l-[3px] transition-colors hover:brightness-[0.98]"
                      style={{ background: s.bg, borderLeftColor: s.border }}
                    >
                      <div className="text-sm font-mono font-semibold text-slate-700 w-12">
                        {formatTime(appt.dateDebut)}
                      </div>
                      {appt.patient && (
                        <Avatar prenom={appt.patient.prenom} nom={appt.patient.nom} size="sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {appt.patient?.prenom} {appt.patient?.nom}
                        </div>
                        <div className="text-xs text-slate-500">
                          {appt.type?.libelle || 'Consultation'}
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: s.border, color: '#fff' }}
                      >
                        {s.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Raccourcis */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Raccourcis</h3>
            <div className="space-y-1">
              <ShortcutLink to="/patients" icon={Users} label="Liste des patients" tint="#0e6ba8" />
              <ShortcutLink to="/agenda" icon={Calendar} label="Planning de la semaine" tint="#2dd4bf" />
              <ShortcutLink to="/finance" icon={Wallet} label="Facturation" tint="#d97706" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon, tint }: {
  label: string; value: number | string; icon: React.ReactNode; tint: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {label}
          </div>
          <div className="font-display text-3xl font-semibold mt-2">{value}</div>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${tint}1a`, color: tint }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ShortcutLink({ to, icon: Icon, label, tint }: {
  to: string; icon: LucideIcon; label: string; tint: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${tint}1a`, color: tint }}
      >
        <Icon size={16} />
      </span>
      <span className="flex-1 font-medium text-slate-700">{label}</span>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400" />
    </Link>
  );
}
