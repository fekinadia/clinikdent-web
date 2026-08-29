import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { UserX } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { noShowRecoveriesApi, NoShowRecovery } from '@/api/endpoints';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort, formatTime } from '@/lib/utils';

const STATUT_BADGE: Record<NoShowRecovery['statut'], { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'badge-warning' },
  recupere: { label: 'Récupéré', className: 'badge-success' },
  perdu: { label: 'Perdu', className: 'badge-danger' },
};

const FILTER_OPTIONS: { value: NoShowRecovery['statut'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'recupere', label: 'Récupéré' },
  { value: 'perdu', label: 'Perdu' },
];

function getPatient(item: NoShowRecovery): { id: number; nom: string; prenom: string } | null {
  const r: any = item;
  return r.patient ?? r.appointment?.patient ?? r.rendezVous?.patient ?? null;
}

function getAppointmentDate(item: NoShowRecovery): string | null {
  const r: any = item;
  return r.appointment?.dateDebut ?? r.rendezVous?.dateDebut ?? r.dateDebut ?? r.dateRendezVous ?? null;
}

function getDentiste(item: NoShowRecovery): string | null {
  const r: any = item;
  const m = r.appointment?.medecin ?? r.rendezVous?.medecin ?? r.medecin ?? r.dentiste;
  if (!m) return null;
  if (typeof m === 'string') return m;
  return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || null;
}

function getTypeRdv(item: NoShowRecovery): string | null {
  const r: any = item;
  const t = r.appointment?.type ?? r.rendezVous?.type ?? r.type ?? r.typeRendezVous;
  if (!t) return null;
  if (typeof t === 'string') return t;
  return t.libelle ?? null;
}

export function AutomationNoShowsPage() {
  const qc = useQueryClient();
  const [statutFilter, setStatutFilter] = useState<NoShowRecovery['statut'] | 'all'>('all');

  const { data: items = [], isLoading } = useQuery<NoShowRecovery[]>({
    queryKey: ['no-show-recoveries', statutFilter],
    queryFn: () => noShowRecoveriesApi.list(statutFilter === 'all' ? undefined : statutFilter),
  });

  const markLostMutation = useMutation({
    mutationFn: (id: number) => noShowRecoveriesApi.markAsLost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['no-show-recoveries'] });
      toast.success('Marqué comme perdu');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la mise à jour'),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">No-Shows</h1>
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
          ) : items.length === 0 ? (
            <EmptyState
              icon={<UserX size={48} />}
              title="Aucun no-show pour l'instant"
              description="Les relances de rendez-vous manqués apparaîtront ici automatiquement."
            />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[2fr_1.3fr_1.3fr_1.3fr_1fr_auto] gap-3 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                  <div>Patient</div>
                  <div>Date du rendez-vous</div>
                  <div>Dentiste</div>
                  <div>Type</div>
                  <div>Statut</div>
                  <div></div>
                </div>
                {items.map((item) => {
                  const badge = STATUT_BADGE[item.statut];
                  const patient = getPatient(item);
                  const apptDate = getAppointmentDate(item);
                  const dentiste = getDentiste(item);
                  const type = getTypeRdv(item);
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[2fr_1.3fr_1.3fr_1.3fr_1fr_auto] gap-3 px-3 py-3 items-center border-b border-slate-100 last:border-0"
                    >
                      <div className="min-w-0">
                        {patient ? (
                          <Link
                            to={`/patients/${patient.id}`}
                            className="font-medium text-sm text-slate-900 hover:text-primary-600 truncate block"
                          >
                            {patient.prenom} {patient.nom}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">Patient inconnu</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        {apptDate ? `${formatDateShort(apptDate)} à ${formatTime(apptDate)}` : '—'}
                      </div>
                      <div className="text-sm text-slate-600">{dentiste || '—'}</div>
                      <div className="text-sm text-slate-600">{type || '—'}</div>
                      <div>
                        <span className={clsx('badge', badge.className)}>{badge.label}</span>
                      </div>
                      <div className="text-right">
                        {item.statut === 'en_attente' && (
                          <button
                            onClick={() => markLostMutation.mutate(item.id)}
                            disabled={markLostMutation.isPending}
                            className="btn-ghost !px-2 !py-1.5 text-xs whitespace-nowrap"
                          >
                            Marquer comme perdu
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
