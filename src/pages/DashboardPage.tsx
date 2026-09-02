import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Calendar, TrendingUp, AlertCircle, ArrowRight, Wallet } from 'lucide-react';
import { patientsApi, appointmentsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatTime } from '@/lib/utils';

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
            icon={<Users size={20} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Total patients"
            value={stats?.total ?? '—'}
            icon={<Users size={20} className="text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatCard
            label="Nouveaux ce mois"
            value={stats?.ceMois ?? '—'}
            icon={<TrendingUp size={20} className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Alertes"
            value="0"
            icon={<AlertCircle size={20} className="text-rose-600" />}
            color="bg-rose-50"
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
                {todayAppts?.map((appt) => (
                  <Link
                    key={appt.id}
                    to={`/patients/${appt.patientId}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="text-sm font-mono font-semibold text-slate-700 w-12">
                      {formatTime(appt.dateDebut)}
                    </div>
                    <div
                      className="w-1 h-8 rounded"
                      style={{ background: appt.type?.couleur || '#3b82f6' }}
                    />
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
                      className={`badge ${
                        appt.statut === 'termine' ? 'badge-success'
                        : appt.statut === 'en_cours' ? 'badge-warning'
                        : appt.statut === 'annule' ? 'badge-danger'
                        : 'badge-info'
                      }`}
                    >
                      {statusLabel(appt.statut)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activité */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Raccourcis</h3>
            <div className="space-y-2">
              <Link to="/patients" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                <Users size={16} className="text-primary-500" />
                Liste des patients
              </Link>
              <Link to="/agenda" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                <Calendar size={16} className="text-primary-500" />
                Planning de la semaine
              </Link>
              <Link to="/finance" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                <Wallet size={16} className="text-primary-500" />
                Facturation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number | string; icon: React.ReactNode; color: string;
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
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  const labels: Record<string, string> = {
    planifie: 'Planifié', confirme: 'Confirmé', en_cours: 'En cours',
    termine: 'Terminé', annule: 'Annulé', absent: 'Absent',
  };
  return labels[s] || s;
}
