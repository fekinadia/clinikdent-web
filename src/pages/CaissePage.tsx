import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { addDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Banknote,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Printer,
  Undo2,
} from 'lucide-react';
import { caisseApi, type CaissePaiement, type ChequeStatut } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort, formatMoney, formatTime } from '@/lib/utils';

/**
 * Caisse & chèques (2026-09-27) — Phase 1b de la roadmap Cabinet Care.
 *  - Journal du jour : tous les encaissements d'une date, totaux par mode
 *    de règlement, impression et export CSV.
 *  - Chèques : suivi des chèques reçus (en attente / encaissés), échéances
 *    des chèques post-datés, « Marquer encaissé ».
 * S'appuie sur la table Payment existante (une ligne par encaissement,
 * créée par « Encaisser » sur un acte).
 */

const MODES: Record<string, { label: string; color: string }> = {
  especes: { label: 'Espèces', color: '#16a34a' },
  cheque: { label: 'Chèque', color: '#0e6ba8' },
  d17: { label: 'D17', color: '#7c3aed' },
  virement: { label: 'Virement', color: '#d97706' },
  cnam: { label: 'CNAM', color: '#e11d48' },
};
const modeInfo = (m: string) => MODES[m] ?? { label: m, color: '#64748b' };

const today = () => format(new Date(), 'yyyy-MM-dd');

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? '');
          return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(';'),
    )
    .join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CaissePage() {
  const [tab, setTab] = useState<'jour' | 'cheques'>('jour');

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Caisse &amp; chèques</h1>
          <p className="text-xs text-slate-500 mt-0.5">Encaissements du jour et suivi des chèques</p>
        </div>
        <div className="flex bg-slate-100 rounded-full p-1 text-sm">
          {([
            ['jour', 'Journal du jour', Banknote],
            ['cheques', 'Chèques', Landmark],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full flex items-center gap-1.5 font-medium transition ${
                tab === key ? 'bg-white shadow-sm text-accent-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 animate-fade-in">
        {tab === 'jour' ? <JournalDuJour /> : <SuiviCheques />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Journal du jour
// ---------------------------------------------------------------------------

function JournalDuJour() {
  const [date, setDate] = useState(today());
  const { data, isLoading } = useQuery({
    queryKey: ['caisse', date],
    queryFn: () => caisseApi.jour(date),
  });

  const shift = (days: number) => setDate(format(addDays(parseISO(date), days), 'yyyy-MM-dd'));
  const dateLabel = format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr });
  const isToday = date === today();

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`caisse_${date}.csv`, [
      ['Heure', 'Patient', 'Dossier', 'Acte', 'Mode', 'N° chèque', 'Banque', 'Montant (DT)'],
      ...data.paiements.map((p) => [
        formatTime(p.heure),
        `${p.prenomPatient} ${p.nomPatient}`,
        p.numeroDossier,
        p.acte ?? '',
        modeInfo(p.modeReglement).label,
        p.numeroCheque ?? '',
        p.banque ?? '',
        String(p.montant).replace('.', ','),
      ]),
      ['', '', '', '', '', '', 'Total', String(data.total).replace('.', ',')],
    ]);
  };

  return (
    <>
      {/* Navigation par jour */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50" aria-label="Jour précédent">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="input !w-auto !py-1.5"
          />
          <button
            onClick={() => shift(1)}
            disabled={isToday}
            className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
            aria-label="Jour suivant"
          >
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setDate(today())} className="btn-ghost !rounded-full text-sm">
              Aujourd'hui
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} disabled={!data?.nombre} className="btn-ghost !rounded-full text-sm flex items-center gap-1.5 disabled:opacity-40">
            <Printer size={14} /> Imprimer
          </button>
          <button onClick={exportCsv} disabled={!data?.nombre} className="btn-ghost !rounded-full text-sm flex items-center gap-1.5 disabled:opacity-40">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="py-16"><Spinner /></div>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
            <div className="card p-4 col-span-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Total · {dateLabel}
              </div>
              <div className="font-display text-3xl font-semibold mt-1">
                {formatMoney(data.total)} <span className="text-base text-slate-400">DT</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {data.nombre} encaissement{data.nombre > 1 ? 's' : ''}
              </div>
            </div>
            {Object.keys(MODES).map((m) => (
              <div key={m} className="card p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: MODES[m].color }}>
                  {MODES[m].label}
                </div>
                <div className="font-display text-xl font-semibold mt-1">
                  {formatMoney(data.parMode[m] ?? 0)}
                </div>
              </div>
            ))}
          </div>

          {data.nombre === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Banknote size={40} />}
                title="Aucun encaissement ce jour-là"
                description="Les paiements enregistrés avec « Encaisser » sur la fiche patient apparaissent ici."
              />
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="px-2 md:px-4 py-3">Heure</th>
                    <th className="px-2 md:px-4 py-3">Patient</th>
                    <th className="px-2 md:px-4 py-3 hidden md:table-cell">Acte</th>
                    <th className="px-2 md:px-4 py-3">Mode</th>
                    <th className="px-2 md:px-4 py-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paiements.map((p) => (
                    <PaiementRow key={p.id} p={p} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="px-2 md:px-4 py-3" colSpan={3}>Total</td>
                    <td className="hidden md:table-cell" />
                    <td className="px-2 md:px-4 py-3 text-right">{formatMoney(data.total)} DT</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Version imprimable (visible uniquement à l'impression) */}
          <div className="print-area">
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Journal de caisse</h1>
            <p style={{ textTransform: 'capitalize', marginBottom: 16 }}>{dateLabel}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Heure', 'Patient', 'Acte', 'Mode', 'Montant (DT)'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: 4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.paiements.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: 4 }}>{formatTime(p.heure)}</td>
                    <td style={{ padding: 4 }}>{p.prenomPatient} {p.nomPatient}</td>
                    <td style={{ padding: 4 }}>{p.acte ?? ''}</td>
                    <td style={{ padding: 4 }}>
                      {modeInfo(p.modeReglement).label}
                      {p.numeroCheque ? ` n° ${p.numeroCheque}` : ''}
                    </td>
                    <td style={{ padding: 4 }}>{formatMoney(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16, fontWeight: 700 }}>
              Total : {formatMoney(data.total)} DT —{' '}
              {Object.entries(data.parMode).map(([m, v]) => `${modeInfo(m).label} ${formatMoney(v)}`).join(' · ')}
            </p>
          </div>
        </>
      )}
    </>
  );
}

function PaiementRow({ p }: { p: CaissePaiement }) {
  const m = modeInfo(p.modeReglement);
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-2 md:px-4 py-3 font-mono text-slate-600">{formatTime(p.heure)}</td>
      <td className="px-2 md:px-4 py-3">
        <Link to={`/patients/${p.patientId}`} className="font-medium text-slate-800 hover:underline">
          {p.prenomPatient} {p.nomPatient}
        </Link>
        <div className="text-[11px] text-slate-400">Dossier {p.numeroDossier}</div>
        {p.acte && <div className="text-[11px] text-slate-500 md:hidden">{p.acte}</div>}
      </td>
      <td className="px-2 md:px-4 py-3 text-slate-600 hidden md:table-cell">{p.acte ?? '—'}</td>
      <td className="px-2 md:px-4 py-3">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1a`, color: m.color }}>
          {m.label}
        </span>
        {p.modeReglement === 'cheque' && (p.numeroCheque || p.banque) && (
          <div className="text-[11px] text-slate-400 mt-0.5">
            {p.numeroCheque && `n° ${p.numeroCheque}`} {p.banque && `· ${p.banque}`}
          </div>
        )}
      </td>
      <td className="px-2 md:px-4 py-3 text-right font-semibold whitespace-nowrap">{formatMoney(p.montant)} DT</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Suivi des chèques
// ---------------------------------------------------------------------------

function SuiviCheques() {
  const qc = useQueryClient();
  const [statut, setStatut] = useState<ChequeStatut>('en_attente');
  const { data, isLoading } = useQuery({
    queryKey: ['cheques', statut],
    queryFn: () => caisseApi.cheques(statut),
  });

  const mutation = useMutation({
    mutationFn: ({ id, encaisse }: { id: number; encaisse: boolean }) =>
      caisseApi.setEncaisse(id, encaisse, encaisse ? today() : undefined),
    onSuccess: (_r, v) => {
      toast.success(v.encaisse ? 'Chèque marqué encaissé' : 'Encaissement annulé');
      qc.invalidateQueries({ queryKey: ['cheques'] });
      qc.invalidateQueries({ queryKey: ['caisse'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Impossible de mettre à jour le chèque'),
  });

  const t = today();

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex bg-white border border-slate-200 rounded-full p-1 text-sm">
          {([
            ['en_attente', 'En attente'],
            ['encaisse', 'Encaissés'],
            ['tous', 'Tous'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatut(key)}
              className={`px-4 py-1.5 rounded-full font-medium transition ${
                statut === key ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {data && (
          <div className="text-sm text-slate-600">
            À encaisser : <span className="font-display text-lg font-semibold text-primary-600">{formatMoney(data.totalEnAttente)} DT</span>
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="py-16"><Spinner /></div>
      ) : data.cheques.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Landmark size={40} />}
            title={statut === 'en_attente' ? 'Aucun chèque en attente' : 'Aucun chèque'}
            description="Choisissez « Chèque » comme mode de règlement lors d'un encaissement pour le suivre ici."
          />
        </div>
      ) : (
        <>
        {/* Mobile : cartes (le tableau ne tient pas en largeur) */}
        <div className="md:hidden space-y-2">
          {data.cheques.map((c) => {
            const ech = c.dateEcheance?.slice(0, 10) ?? null;
            const encaissable = !c.dateEncaissement && (!ech || ech <= t);
            const enRetard = !c.dateEncaissement && ech !== null && ech < t;
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/patients/${c.patientId}`} className="font-medium text-slate-800 hover:underline">
                      {c.prenomPatient} {c.nomPatient}
                    </Link>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {c.numeroCheque ? `n° ${c.numeroCheque}` : 'n° non renseigné'}
                      {c.banque && ` · ${c.banque}`} · reçu le {formatDateShort(c.datePaiement)}
                    </div>
                    {ech && (
                      <div className={`text-xs mt-1 ${enRetard ? 'text-rose-600 font-semibold' : encaissable ? 'text-emerald-700' : 'text-slate-600'}`}>
                        Échéance {formatDateShort(ech)}{enRetard && ' · dépassée'}
                      </div>
                    )}
                  </div>
                  <div className="font-display text-lg font-semibold whitespace-nowrap">{formatMoney(c.montant)} DT</div>
                </div>
                <div className="flex justify-end mt-3">
                  {c.dateEncaissement ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Encaissé le {formatDateShort(c.dateEncaissement)}
                      </span>
                      <button onClick={() => mutation.mutate({ id: c.id, encaisse: false })} disabled={mutation.isPending}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400" title="Annuler l'encaissement">
                        <Undo2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => mutation.mutate({ id: c.id, encaisse: true })} disabled={mutation.isPending}
                      className={`!rounded-full !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5 ${encaissable ? 'btn-primary' : 'btn-ghost'}`}>
                      <CalendarCheck size={13} /> Marquer encaissé
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="card overflow-x-auto hidden md:block">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-2 md:px-4 py-3">Reçu le</th>
                <th className="px-2 md:px-4 py-3">Patient</th>
                <th className="px-2 md:px-4 py-3">Chèque</th>
                <th className="px-2 md:px-4 py-3">Échéance</th>
                <th className="px-2 md:px-4 py-3 text-right">Montant</th>
                <th className="px-2 md:px-4 py-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.cheques.map((c) => {
                const ech = c.dateEcheance?.slice(0, 10) ?? null;
                const encaissable = !c.dateEncaissement && (!ech || ech <= t);
                const enRetard = !c.dateEncaissement && ech !== null && ech < t;
                return (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 md:px-4 py-3 text-slate-600">{formatDateShort(c.datePaiement)}</td>
                    <td className="px-2 md:px-4 py-3">
                      <Link to={`/patients/${c.patientId}`} className="font-medium text-slate-800 hover:underline">
                        {c.prenomPatient} {c.nomPatient}
                      </Link>
                      <div className="text-[11px] text-slate-400">Dossier {c.numeroDossier}</div>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-slate-600">
                      {c.numeroCheque ? `n° ${c.numeroCheque}` : <span className="text-slate-400">n° non renseigné</span>}
                      {c.banque && <div className="text-[11px] text-slate-400">{c.banque}</div>}
                    </td>
                    <td className="px-2 md:px-4 py-3">
                      {ech ? (
                        <span className={enRetard ? 'text-rose-600 font-semibold' : encaissable ? 'text-emerald-700 font-medium' : 'text-slate-600'}>
                          {formatDateShort(ech)}
                          {enRetard && ' · dépassée'}
                          {!enRetard && ech === t && !c.dateEncaissement && " · aujourd'hui"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 md:px-4 py-3 text-right font-semibold">{formatMoney(c.montant)} DT</td>
                    <td className="px-2 md:px-4 py-3 text-right">
                      {c.dateEncaissement ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Encaissé le {formatDateShort(c.dateEncaissement)}
                          </span>
                          <button
                            onClick={() => mutation.mutate({ id: c.id, encaisse: false })}
                            disabled={mutation.isPending}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                            title="Annuler l'encaissement"
                          >
                            <Undo2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => mutation.mutate({ id: c.id, encaisse: true })}
                          disabled={mutation.isPending}
                          className={`!rounded-full !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5 ${encaissable ? 'btn-primary' : 'btn-ghost'}`}
                          title={encaissable ? undefined : "L'échéance n'est pas encore atteinte"}
                        >
                          <CalendarCheck size={13} /> Marquer encaissé
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
