import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BellRing, MessageCircle, CalendarPlus, PhoneOff } from 'lucide-react';
import { patientsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';

const PERIODS = [
  { months: 6, label: '6 mois' },
  { months: 12, label: '12 mois' },
];

export function RecallsPage() {
  const [months, setMonths] = useState(6);

  const { data: recalls, isLoading } = useQuery({
    queryKey: ['patients-recalls', months],
    queryFn: () => patientsApi.recalls(months),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <BellRing size={20} className="text-primary-500" />
            Rappels
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Patients sans contrôle depuis un moment, et sans rendez-vous prévu
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.months}
              onClick={() => setMonths(p.months)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                months === p.months
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              + de {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="py-12"><Spinner /></div>
          ) : !recalls || recalls.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-medium text-slate-700">Aucun patient à relancer</p>
              <p className="text-xs text-slate-400 mt-1">
                Tous vos patients ont eu un contrôle récent ou ont déjà un rendez-vous prévu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recalls.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <Avatar prenom={patient.prenom} nom={patient.nom} size="sm" />

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="font-medium text-sm text-slate-900 hover:text-primary-600 truncate block"
                    >
                      {patient.prenom} {patient.nom}
                    </Link>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      {patient.gsm || patient.telephoneFixe || (
                        <span className="flex items-center gap-1 text-slate-300">
                          <PhoneOff size={11} /> Pas de téléphone
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="badge badge-warning whitespace-nowrap">
                    Dernier contrôle il y a {patient.moisEcoules} mois
                  </span>

                  <div className="flex items-center gap-2">
                    {patient.gsm && (
                      <a
                        href={buildWhatsAppLink(patient.gsm, patient.prenom)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost !p-2"
                        title="Contacter via WhatsApp"
                      >
                        <MessageCircle size={16} className="text-emerald-600" />
                      </a>
                    )}
                    <Link
                      to={`/agenda?patientId=${patient.id}`}
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      <CalendarPlus size={14} /> Créer RDV
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function buildWhatsAppLink(gsm: string, prenom: string) {
  let digits = gsm.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `216${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `216${digits}`;

  const message = encodeURIComponent(
    `Bonjour ${prenom}, votre prochain contrôle dentaire est recommandé. Souhaitez-vous réserver un rendez-vous ?`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}
