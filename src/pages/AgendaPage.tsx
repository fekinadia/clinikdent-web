import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { appointmentsApi, patientsApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog';
import type { Patient, Appointment } from '@/types';

const HOURS = Array.from({ length: 22 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

type ViewMode = 'jour' | 'semaine' | 'mois';

const VIEW_LABELS: Record<ViewMode, string> = {
  jour: 'Jour',
  semaine: 'Semaine',
  mois: 'Mois',
};

export function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('semaine');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogPatient, setDialogPatient] = useState<Patient | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  const rangeStart =
    viewMode === 'jour' ? startOfDay(currentDate) : viewMode === 'semaine' ? weekStart : monthGridStart;
  const rangeEnd =
    viewMode === 'jour' ? endOfDay(currentDate) : viewMode === 'semaine' ? addDays(weekStart, 6) : monthGridEnd;

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', viewMode, rangeStart.toISOString()],
    queryFn: () =>
      appointmentsApi.list({
        dateDebut: rangeStart.toISOString(),
        dateFin: rangeEnd.toISOString(),
      }),
  });

  // Ouvre automatiquement le dialogue avec un patient présélectionné quand on
  // arrive depuis /agenda?patientId=123 (ex. bouton "Créer RDV" des Rappels).
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (!patientId) return;

    let cancelled = false;
    patientsApi
      .get(Number(patientId))
      .then((patient) => {
        if (cancelled) return;
        setDialogPatient(patient);
        setIsDialogOpen(true);
      })
      .catch(() => {
        // patient introuvable : on ignore silencieusement
      })
      .finally(() => {
        if (!cancelled) {
          searchParams.delete('patientId');
          setSearchParams(searchParams, { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setDialogPatient(null);
    setEditingAppointment(null);
  };

  const openEditDialog = (appt: Appointment) => {
    setEditingAppointment(appt);
  };

  const goToPrevious = () => {
    if (viewMode === 'jour') setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === 'semaine') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const goToNext = () => {
    if (viewMode === 'jour') setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === 'semaine') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const goToDay = (day: Date) => {
    setCurrentDate(day);
    setViewMode('jour');
  };

  const headerLabel =
    viewMode === 'jour'
      ? format(currentDate, "EEEE d MMMM yyyy", { locale: fr })
      : viewMode === 'semaine'
      ? `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })}`
      : format(currentDate, 'MMMM yyyy', { locale: fr });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Agenda</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                  viewMode === v
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <button onClick={goToPrevious} className="btn-ghost !p-2">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="btn-ghost">
            Aujourd'hui
          </button>
          <button onClick={goToNext} className="btn-ghost !p-2">
            <ChevronRight size={18} />
          </button>
          <button className="btn-primary sm:ml-2" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} /> Nouveau RDV
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-3 sm:p-6 animate-fade-in">
        <div className="card overflow-hidden">
          {viewMode === 'mois' ? (
            <MonthGrid
              monthDays={monthDays}
              currentMonth={currentDate}
              appointments={appointments}
              isLoading={isLoading}
              onSelectDay={goToDay}
            />
          ) : (
            <div className="overflow-x-auto">
              <HourGrid
                days={viewMode === 'jour' ? [currentDate] : weekDays}
                appointments={appointments}
                isLoading={isLoading}
                onEdit={openEditDialog}
              />
            </div>
          )}
        </div>
      </div>

      <NewAppointmentDialog
        isOpen={isDialogOpen || !!editingAppointment}
        onClose={closeDialog}
        initialPatient={dialogPatient}
        appointment={editingAppointment}
      />
    </>
  );
}

const STATUT_INFO: Record<string, { label: string; dot: string }> = {
  planifie: { label: 'Planifié', dot: '#94a3b8' },
  confirme: { label: 'Confirmé', dot: '#0e6ba8' },
  en_cours: { label: 'En cours', dot: '#d97706' },
  termine: { label: 'Terminé', dot: '#16a34a' },
  annule: { label: 'Annulé', dot: '#e11d48' },
  absent: { label: 'Absent', dot: '#64748b' },
};

/** Grille horaire (08:00-18:30) utilisée pour les vues Jour et Semaine. */
function HourGrid({
  days,
  appointments,
  isLoading,
  onEdit,
}: {
  days: Date[];
  appointments?: Appointment[];
  isLoading: boolean;
  onEdit: (appt: Appointment) => void;
}) {
  const gridTemplateColumns = `52px repeat(${days.length}, minmax(96px, 1fr))`;

  return (
    <div style={{ minWidth: days.length > 1 ? '640px' : '320px' }}>
      {/* En-têtes */}
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns }}>
        <div />
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-l border-slate-200 ${isToday ? 'bg-primary-50' : ''}`}
            >
              <div
                className={`text-xs uppercase tracking-wider font-semibold ${
                  isToday ? 'text-primary-600' : 'text-slate-500'
                }`}
              >
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={`text-lg font-display font-semibold mt-0.5 ${isToday ? 'text-primary-600' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid relative" style={{ gridTemplateColumns }}>
          {HOURS.map((hour, hourIdx) => (
            <div key={hour} className="contents">
              <div className="text-xs text-slate-400 text-right pr-2 py-1.5 border-r border-slate-200 h-8">
                {hourIdx % 2 === 0 ? hour : ''}
              </div>
              {days.map((day, dayIdx) => {
                const [h, m] = hour.split(':').map(Number);

                const appt = appointments?.find((a) => {
                  const aDate = parseISO(a.dateDebut);
                  return isSameDay(aDate, day) && aDate.getHours() === h && aDate.getMinutes() === m;
                });

                return (
                  <div
                    key={dayIdx}
                    className={`h-8 border-b border-l border-slate-100 relative ${
                      hourIdx % 2 === 1 ? 'border-b-slate-200' : ''
                    }`}
                  >
                    {appt && <AppointmentBlock appt={appt} onEdit={onEdit} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MONTH_WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Grille mensuelle : une case par jour avec un aperçu des RDV du jour. */
function MonthGrid({
  monthDays,
  currentMonth,
  appointments,
  isLoading,
  onSelectDay,
}: {
  monthDays: Date[];
  currentMonth: Date;
  appointments?: Appointment[];
  isLoading: boolean;
  onSelectDay: (day: Date) => void;
}) {
  return (
    <div style={{ minWidth: '640px' }}>
      <div className="grid grid-cols-7 border-b border-slate-200">
        {MONTH_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="p-2 text-center text-xs uppercase tracking-wider font-semibold text-slate-500 border-l border-slate-200 first:border-l-0"
          >
            {label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const dayAppointments = (appointments ?? [])
              .filter((a) => isSameDay(parseISO(a.dateDebut), day))
              .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
            const visible = dayAppointments.slice(0, 3);
            const extra = dayAppointments.length - visible.length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                className={`min-h-[100px] p-1.5 border-b border-l border-slate-100 first:border-l-0 text-left align-top hover:bg-slate-50 transition-colors ${
                  !inMonth ? 'bg-slate-50/60' : ''
                }`}
              >
                <div
                  className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                    isToday ? 'bg-primary-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {visible.map((a) => (
                    <div
                      key={a.id}
                      className="text-[10px] leading-tight truncate rounded px-1 py-0.5"
                      style={{
                        background: `${a.type?.couleur || '#3b82f6'}22`,
                        color: a.type?.couleur || '#3b82f6',
                      }}
                    >
                      {format(parseISO(a.dateDebut), 'HH:mm')} {a.patient?.prenom} {a.patient?.nom}
                    </div>
                  ))}
                  {extra > 0 && <div className="text-[10px] text-slate-400 px-1">+{extra} autre{extra > 1 ? 's' : ''}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentBlock({ appt, onEdit }: { appt: Appointment; onEdit: (appt: Appointment) => void }) {
  const queryClient = useQueryClient();
  const start = parseISO(appt.dateDebut);
  const end = parseISO(appt.dateFin);
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  const height = (durationMin / 30) * 32;
  const color = appt.type?.couleur || '#3b82f6';

  const deleteMutation = useMutation({
    mutationFn: () => appointmentsApi.delete(appt.id),
    onSuccess: () => {
      toast.success('Rendez-vous supprimé');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de supprimer ce rendez-vous');
    },
  });

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(appt);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nom = `${appt.patient?.prenom ?? ''} ${appt.patient?.nom ?? ''}`.trim();
    if (confirm(`Supprimer le rendez-vous${nom ? ` de ${nom}` : ''} ?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <Link
      to={`/patients/${appt.patientId}`}
      className="group absolute left-0.5 right-0.5 top-0 rounded px-2 py-1 text-[11px] font-medium overflow-hidden cursor-pointer hover:z-10 hover:shadow-md transition-shadow"
      style={{
        height: `${height - 2}px`,
        background: `${color}22`,
        borderLeft: `3px solid ${color}`,
        color,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="font-semibold truncate flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: (STATUT_INFO[appt.statut]?.dot) || '#94a3b8' }}
              title={STATUT_INFO[appt.statut]?.label || appt.statut}
            />
            <span className="truncate">{appt.patient?.prenom} {appt.patient?.nom}</span>
          </div>
          <div className="opacity-75 truncate">{appt.type?.libelle}</div>
        </div>
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0 bg-white/95 rounded shadow-sm px-0.5 py-0.5">
          <button
            onClick={handleEdit}
            title="Modifier le rendez-vous"
            className="p-0.5 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            title="Supprimer le rendez-vous"
            className="p-0.5 rounded hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition disabled:opacity-40"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </Link>
  );
}
