import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { appointmentsApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';

const HOURS = Array.from({ length: 22 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export function AgendaPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', weekStart.toISOString()],
    queryFn: () =>
      appointmentsApi.list({
        dateDebut: weekStart.toISOString(),
        dateFin: addDays(weekStart, 6).toISOString(),
      }),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Agenda</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Semaine du {format(weekStart, 'd MMMM', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="btn-ghost !p-2"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="btn-ghost"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="btn-ghost !p-2"
          >
            <ChevronRight size={18} />
          </button>
          <button className="btn-primary ml-2">
            <Plus size={16} /> Nouveau RDV
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="card overflow-hidden">
          {/* En-têtes */}
          <div
            className="grid border-b border-slate-200"
            style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}
          >
            <div />
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-l border-slate-200 ${
                    isToday ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className={`text-xs uppercase tracking-wider font-semibold ${
                    isToday ? 'text-primary-600' : 'text-slate-500'
                  }`}>
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={`text-lg font-display font-semibold mt-0.5 ${
                    isToday ? 'text-primary-600' : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille */}
          {isLoading ? (
            <div className="py-12"><Spinner /></div>
          ) : (
            <div
              className="grid relative"
              style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}
            >
              {HOURS.map((hour, hourIdx) => (
                <div key={hour} className="contents">
                  <div className="text-xs text-slate-400 text-right pr-2 py-1.5 border-r border-slate-200 h-8">
                    {hourIdx % 2 === 0 ? hour : ''}
                  </div>
                  {days.map((day, dayIdx) => {
                    const slotStart = new Date(day);
                    const [h, m] = hour.split(':').map(Number);
                    slotStart.setHours(h, m, 0, 0);

                    const appt = appointments?.find((a) => {
                      const aDate = parseISO(a.dateDebut);
                      return (
                        isSameDay(aDate, day) &&
                        aDate.getHours() === h &&
                        aDate.getMinutes() === m
                      );
                    });

                    return (
                      <div
                        key={dayIdx}
                        className={`h-8 border-b border-l border-slate-100 relative ${
                          hourIdx % 2 === 1 ? 'border-b-slate-200' : ''
                        }`}
                      >
                        {appt && <AppointmentBlock appt={appt} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AppointmentBlock({ appt }: { appt: any }) {
  const start = parseISO(appt.dateDebut);
  const end = parseISO(appt.dateFin);
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  const height = (durationMin / 30) * 32;
  const color = appt.type?.couleur || '#3b82f6';

  return (
    <Link
      to={`/patients/${appt.patientId}`}
      className="absolute left-0.5 right-0.5 top-0 rounded px-2 py-1 text-[11px] font-medium overflow-hidden cursor-pointer hover:z-10 hover:shadow-md transition-shadow"
      style={{
        height: `${height - 2}px`,
        background: `${color}22`,
        borderLeft: `3px solid ${color}`,
        color,
      }}
    >
      <div className="font-semibold truncate">
        {appt.patient?.prenom} {appt.patient?.nom}
      </div>
      <div className="opacity-75 truncate">{appt.type?.libelle}</div>
    </Link>
  );
}
