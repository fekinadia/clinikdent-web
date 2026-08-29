import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import clsx from 'clsx';
import { appointmentRemindersApi, AppointmentReminder } from '@/api/endpoints';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort, formatTime } from '@/lib/utils';

const STATUT_BADGE: Record<AppointmentReminder['statut'], { label: string; className: string }> = {
  programme: { label: 'Programmé', className: 'bg-slate-100 text-slate-600' },
  envoye: { label: 'Envoyé', className: 'badge-info' },
  delivre: { label: 'Délivré', className: 'badge-info' },
  lu: { label: 'Lu', className: 'badge-success' },
  repondu: { label: 'Répondu', className: 'badge-success' },
  echec: { label: 'Échec', className: 'badge-danger' },
  annule: { label: 'Annulé', className: 'bg-slate-100 text-slate-500' },
};

const FILTER_OPTIONS: { value: AppointmentReminder['statut'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'programme', label: 'Programmé' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'delivre', label: 'Délivré' },
  { value: 'lu', label: 'Lu' },
  { value: 'repondu', label: 'Répondu' },
  { value: 'echec', label: 'Échec' },
  { value: 'annule', label: 'Annulé' },
];

function getPatient(reminder: AppointmentReminder): { id: number; nom: string; prenom: string } | null {
  const r: any = reminder;
  return r.patient ?? r.appointment?.patient ?? r.rendezVous?.patient ?? null;
}

function getAppointmentDate(reminder: AppointmentReminder): string | null {
  const r: any = reminder;
  return r.appointment?.dateDebut ?? r.rendezVous?.dateDebut ?? r.dateDebut ?? r.dateRendezVous ?? null;
}

export function AutomationRemindersPage() {
  const [statutFilter, setStatutFilter] = useState<AppointmentReminder['statut'] | 'all'>('all');

  const { data: reminders = [], isLoading } = useQuery<AppointmentReminder[]>({
    queryKey: ['appointment-reminders', statutFilter],
    queryFn: () => appointmentRemindersApi.list(statutFilter === 'all' ? undefined : statutFilter),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Rappels</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="card p-6">
          <div className="flex gap-2 mb-4 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatutFilter(opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  statutFilter === opt.value ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : reminders.length === 0 ? (
            <EmptyState
              icon={<BellRing size={48} />}
              title="Aucun rappel programmé pour l'instant"
              description="Les rappels de rendez-vous automatiques apparaîtront ici dès qu'ils seront programmés."
            />
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => {
                const badge = STATUT_BADGE[reminder.statut];
                const patient = getPatient(reminder);
                const apptDate = getAppointmentDate(reminder);
                return (
                  <div key={reminder.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {patient ? (
                            <Link
                              to={`/patients/${patient.id}`}
                              className="font-medium text-sm text-slate-900 hover:text-primary-600"
                            >
                              {patient.prenom} {patient.nom}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm text-slate-400">Patient inconnu</span>
                          )}
                          <span className={clsx('badge', badge.className)}>{badge.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5">
                          {apptDate ? (
                            <>Rendez-vous le {formatDateShort(apptDate)} à {formatTime(apptDate)}</>
                          ) : (
                            'Rendez-vous : date inconnue'
                          )}
                          <span className="text-slate-400"> · Rappel {reminder.offsetHours}h avant</span>
                        </div>
                        {reminder.envoyeAt && (
                          <div className="text-xs text-slate-400 mt-1">
                            Envoyé le {formatDateShort(reminder.envoyeAt)} à {formatTime(reminder.envoyeAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
