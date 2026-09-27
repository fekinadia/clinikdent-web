import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Armchair,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  LogIn,
  RefreshCw,
  Stethoscope,
  Undo2,
  UserX,
} from 'lucide-react';
import { appointmentsApi } from '@/api/endpoints';
import type { Appointment } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatTime } from '@/lib/utils';

/**
 * Salle d'attente (2026-09-26) — suivi en direct des patients du jour :
 *   Attendus (planifié/confirmé) → En salle (arrivé) → Au fauteuil (en cours) → Terminé.
 * Les heures d'arrivée et d'entrée au fauteuil sont posées par le backend
 * lors du changement de statut (voir AppointmentsService.update), pour que
 * les temps d'attente soient justes même si plusieurs postes utilisent l'écran.
 */

const REFRESH_MS = 30_000;
const ATTENTE_ORANGE_MIN = 15;
const ATTENTE_ROUGE_MIN = 30;

const COL = {
  attendus: { tint: '#0e6ba8', label: 'Attendus' },
  salle: { tint: '#7c3aed', label: "En salle d'attente" },
  fauteuil: { tint: '#d97706', label: 'Au fauteuil' },
};

function minutesDepuis(iso?: string | null, now = Date.now()) {
  if (!iso) return null;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function formatDuree(min: number | null) {
  if (min === null) return '—';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

// Re-rendu toutes les 30 s pour que les minutes d'attente avancent à l'écran
// sans attendre le prochain rechargement des données.
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function WaitingRoomPage() {
  const queryClient = useQueryClient();
  const now = useNow();

  const { data: appts = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: appointmentsApi.today,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: Appointment['statut'] }) =>
      appointmentsApi.update(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Impossible de mettre à jour le rendez-vous'),
  });

  const noShowMutation = useMutation({
    mutationFn: (id: number) => appointmentsApi.markNoShow(id),
    onSuccess: () => {
      toast.success('Marqué comme absent (no-show)');
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Impossible de marquer ce rendez-vous'),
  });

  const setStatut = (a: Appointment, statut: Appointment['statut'], message?: string) =>
    statutMutation.mutate(
      { id: a.id, statut },
      { onSuccess: () => message && toast.success(message) },
    );

  const attendus = appts.filter((a) => a.statut === 'planifie' || a.statut === 'confirme');
  const enSalle = appts
    .filter((a) => a.statut === 'arrive')
    .sort((a, b) => (a.heureArrivee ?? a.dateDebut).localeCompare(b.heureArrivee ?? b.dateDebut));
  const auFauteuil = appts.filter((a) => a.statut === 'en_cours');
  const termines = appts.filter((a) => a.statut === 'termine');
  const autres = appts.filter((a) => ['annule', 'absent', 'no_show'].includes(a.statut as string));

  // Temps d'attente moyen des patients déjà reçus aujourd'hui (arrivée → fauteuil).
  const attentes = appts
    .filter((a) => a.heureArrivee && a.heureEntree)
    .map((a) => (new Date(a.heureEntree!).getTime() - new Date(a.heureArrivee!).getTime()) / 60_000);
  const attenteMoyenne = attentes.length
    ? Math.round(attentes.reduce((s, m) => s + m, 0) / attentes.length)
    : null;

  const busy = statutMutation.isPending || noShowMutation.isPending;

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Salle d'attente</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi en direct des patients du jour · mise à jour automatique toutes les 30 s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-ghost !rounded-full flex items-center gap-2 text-sm"
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 animate-fade-in">
        {/* Indicateurs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <Kpi label="Attendus" value={attendus.length} tint={COL.attendus.tint} />
          <Kpi label="En salle" value={enSalle.length} tint={COL.salle.tint} />
          <Kpi label="Au fauteuil" value={auFauteuil.length} tint={COL.fauteuil.tint} />
          <Kpi label="Terminés" value={termines.length} tint="#16a34a" />
          <Kpi
            label="Attente moyenne"
            value={attenteMoyenne === null ? '—' : formatDuree(attenteMoyenne)}
            tint="#64748b"
          />
        </div>

        {isLoading ? (
          <div className="py-16"><Spinner /></div>
        ) : appts.length === 0 ? (
          <div className="card p-10 text-center">
            <CalendarClock size={36} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-display text-lg font-semibold text-slate-700">Aucun rendez-vous aujourd'hui</h3>
            <p className="text-sm text-slate-500 mt-1">Les patients du jour apparaîtront ici dès qu'ils sont planifiés.</p>
            <Link to="/agenda" className="btn-primary !rounded-full inline-flex mt-4">Ouvrir l'agenda</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Attendus */}
              <Column tint={COL.attendus.tint} label={COL.attendus.label} icon={CalendarClock} count={attendus.length}
                empty="Tous les patients attendus sont arrivés.">
                {attendus.map((a) => {
                  const retard = minutesDepuis(a.dateDebut, now);
                  const enRetard = new Date(a.dateDebut).getTime() < now && retard !== null && retard >= 10;
                  return (
                    <PatientCard key={a.id} appt={a} tint={COL.attendus.tint}
                      meta={
                        <>
                          RDV {formatTime(a.dateDebut)}
                          {a.statut === 'confirme' && <span className="text-primary-600"> · confirmé</span>}
                          {enRetard && <span className="text-rose-600 font-semibold"> · en retard de {formatDuree(retard)}</span>}
                        </>
                      }
                      actions={
                        <>
                          <button disabled={busy} onClick={() => setStatut(a, 'arrive', `${a.patient?.prenom ?? 'Patient'} est en salle d'attente`)}
                            className="btn-primary !rounded-full !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                            <LogIn size={13} /> Arrivé
                          </button>
                          {enRetard && (
                            <button disabled={busy} onClick={() => noShowMutation.mutate(a.id)}
                              className="btn-ghost !rounded-full !py-1.5 !px-3 text-xs flex items-center gap-1.5 text-rose-600"
                              title="Le patient ne viendra pas">
                              <UserX size={13} /> Absent
                            </button>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </Column>

              {/* En salle */}
              <Column tint={COL.salle.tint} label={COL.salle.label} icon={Armchair} count={enSalle.length}
                empty="Personne n'attend pour le moment.">
                {enSalle.map((a, i) => {
                  const attente = minutesDepuis(a.heureArrivee, now);
                  const couleur = attente === null ? 'text-slate-500'
                    : attente >= ATTENTE_ROUGE_MIN ? 'text-rose-600'
                    : attente >= ATTENTE_ORANGE_MIN ? 'text-amber-600' : 'text-emerald-600';
                  return (
                    <PatientCard key={a.id} appt={a} tint={COL.salle.tint} rang={i + 1}
                      meta={
                        <>
                          Arrivé à {formatTime(a.heureArrivee)} · RDV {formatTime(a.dateDebut)}
                          <span className={`font-semibold ${couleur}`}> · attend depuis {formatDuree(attente)}</span>
                        </>
                      }
                      actions={
                        <>
                          <button disabled={busy} onClick={() => setStatut(a, 'en_cours')}
                            className="btn-primary !rounded-full !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                            <DoorOpen size={13} /> Faire entrer
                          </button>
                          <button disabled={busy} onClick={() => setStatut(a, 'confirme', 'Arrivée annulée')}
                            className="btn-ghost !rounded-full !py-1.5 !px-2.5 text-xs flex items-center gap-1"
                            title="Annuler l'arrivée (erreur de clic)">
                            <Undo2 size={13} />
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </Column>

              {/* Au fauteuil */}
              <Column tint={COL.fauteuil.tint} label={COL.fauteuil.label} icon={Stethoscope} count={auFauteuil.length}
                empty="Aucun patient au fauteuil.">
                {auFauteuil.map((a) => (
                  <PatientCard key={a.id} appt={a} tint={COL.fauteuil.tint}
                    meta={
                      <>
                        Entré à {formatTime(a.heureEntree)}
                        <span className="font-semibold text-amber-700"> · depuis {formatDuree(minutesDepuis(a.heureEntree, now))}</span>
                        {a.medecin && <> · Dr {a.medecin.prenom} {a.medecin.nom}</>}
                      </>
                    }
                    actions={
                      <button disabled={busy} onClick={() => setStatut(a, 'termine', 'Consultation terminée')}
                        className="btn-primary !rounded-full !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Terminer
                      </button>
                    }
                  />
                ))}
              </Column>
            </div>

            {/* Terminés + annulés/absents */}
            {(termines.length > 0 || autres.length > 0) && (
              <div className="card p-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Déjà passés aujourd'hui</h3>
                <div className="flex flex-wrap gap-2">
                  {[...termines, ...autres].map((a) => {
                    const fini = a.statut === 'termine';
                    return (
                      <Link key={a.id} to={`/patients/${a.patientId}`}
                        className={`text-xs px-3 py-1.5 rounded-full border ${fini
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-500 line-through'}`}>
                        {formatTime(a.dateDebut)} · {a.patient?.prenom} {a.patient?.nom}
                        {!fini && <span className="no-underline"> ({a.statut === 'annule' ? 'annulé' : 'absent'})</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, tint }: { label: string; value: number | string; tint: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="font-display text-2xl font-semibold mt-1" style={{ color: tint }}>{value}</div>
    </div>
  );
}

function Column({ tint, label, icon: Icon, count, empty, children }: {
  tint: string; label: string; icon: typeof Armchair; count: number; empty: string; children: React.ReactNode;
}) {
  return (
    <section className="card p-4 flex flex-col min-h-[180px]" style={{ borderTop: `3px solid ${tint}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tint}1a`, color: tint }}>
          <Icon size={16} />
        </span>
        <h2 className="font-semibold text-sm flex-1">{label}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${tint}1a`, color: tint }}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function PatientCard({ appt, tint, meta, actions, rang }: {
  appt: Appointment; tint: string; meta: React.ReactNode; actions: React.ReactNode; rang?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 border-l-[3px]" style={{ borderLeftColor: tint }}>
      <div className="flex items-start gap-2.5">
        {rang !== undefined && (
          <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${tint}1a`, color: tint }} title="Ordre d'arrivée">
            {rang}
          </span>
        )}
        {appt.patient && <Avatar prenom={appt.patient.prenom} nom={appt.patient.nom} size="sm" />}
        <div className="flex-1 min-w-0">
          <Link to={`/patients/${appt.patientId}`} className="font-medium text-sm text-slate-800 hover:underline truncate block">
            {appt.patient?.prenom} {appt.patient?.nom}
          </Link>
          <div className="text-[11px] text-slate-500">{appt.type?.libelle || 'Consultation'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{meta}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 justify-end">{actions}</div>
    </div>
  );
}
