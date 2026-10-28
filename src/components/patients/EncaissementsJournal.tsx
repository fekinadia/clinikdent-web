import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDownUp, Banknote } from 'lucide-react';

// Journal des encaissements (2026-10-28, demandé par Nadia) : tous les
// encaissements du patient rangés par date (ordre du calendrier) et
// regroupés par mois, au lieu d'être rangés sous le soin qu'ils paient.
// Affichage seul, à partir des paiements déjà renvoyés avec les soins
// (GET /patients/:id/treatments, acts[].payments).

// Mêmes libellés que la Caisse (CaissePage).
const MODES: Record<string, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  d17: 'D17',
  virement: 'Virement',
  cnam: 'CNAM',
};

interface JournalPayment {
  id: number;
  montant: number | string;
  datePaiement: string;
  modeReglement: string;
  numeroCheque?: string | null;
  banque?: string | null;
  dateEcheance?: string | null;
  dateEncaissement?: string | null;
}

interface JournalAct {
  id: number;
  libelle: string;
  dents?: string | null;
  montantRecu: number | string;
  modeReglement?: string | null;
  payments?: JournalPayment[];
}

interface JournalTreatment {
  id: number;
  dateSoin: string;
  acts: JournalAct[];
}

interface Ligne {
  cle: string;
  jour: string; // AAAA-MM-JJ
  montant: number;
  libelle: string;
  dents?: string | null;
  jourSoin: string;
  mode?: string | null;
  cheque?: JournalPayment;
  // Montant « Payé » sans ligne de paiement (saisi avant le correctif du
  // 28/09) : affiché à la date du soin pour que le total reste juste.
  dateDuSoin: boolean;
}

const jourDe = (date: string) => date.slice(0, 10);
const court = (jour: string) => format(parseISO(jour), 'dd/MM/yy');
const dt = (n: number) => `${n.toFixed(2)} DT`;

function construireLignes(treatments: JournalTreatment[]): Ligne[] {
  const lignes: Ligne[] = [];
  for (const t of treatments) {
    for (const a of t.acts ?? []) {
      const payments = a.payments ?? [];
      for (const p of payments) {
        lignes.push({
          cle: `p${p.id}`,
          jour: jourDe(p.datePaiement),
          montant: Number(p.montant),
          libelle: a.libelle,
          dents: a.dents,
          jourSoin: jourDe(t.dateSoin),
          mode: p.modeReglement,
          cheque: p.modeReglement === 'cheque' ? p : undefined,
          dateDuSoin: false,
        });
      }
      const manque = Number(a.montantRecu) - payments.reduce((s, p) => s + Number(p.montant), 0);
      if (manque > 0.0005) {
        lignes.push({
          cle: `a${a.id}`,
          jour: jourDe(t.dateSoin),
          montant: manque,
          libelle: a.libelle,
          dents: a.dents,
          jourSoin: jourDe(t.dateSoin),
          mode: a.modeReglement,
          dateDuSoin: true,
        });
      }
    }
  }
  return lignes;
}

export function EncaissementsJournal({ treatments }: { treatments?: JournalTreatment[] }) {
  const [recentDabord, setRecentDabord] = useState(true);

  const lignes = useMemo(() => construireLignes(treatments ?? []), [treatments]);

  const mois = useMemo(() => {
    const tri = [...lignes].sort((x, y) =>
      x.jour === y.jour ? x.cle.localeCompare(y.cle, undefined, { numeric: true }) : x.jour < y.jour ? -1 : 1,
    );
    if (recentDabord) tri.reverse();
    const groupes: { cle: string; titre: string; lignes: Ligne[]; total: number }[] = [];
    for (const l of tri) {
      const cle = l.jour.slice(0, 7);
      let g = groupes[groupes.length - 1];
      if (!g || g.cle !== cle) {
        g = { cle, titre: format(parseISO(`${cle}-01`), 'MMMM yyyy', { locale: fr }), lignes: [], total: 0 };
        groupes.push(g);
      }
      g.lignes.push(l);
      g.total += l.montant;
    }
    return groupes;
  }, [lignes, recentDabord]);

  const total = lignes.reduce((s, l) => s + l.montant, 0);

  return (
    <section className="card mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900 inline-flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" /> Journal des encaissements
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {lignes.length} encaissement{lignes.length > 1 ? 's' : ''}, rangés par date
          </p>
        </div>
        {lignes.length > 1 && (
          <button
            type="button"
            className="btn-ghost !px-3 !py-1.5 text-xs"
            onClick={() => setRecentDabord((v) => !v)}
          >
            <ArrowDownUp size={14} />
            {recentDabord ? 'Plus récent d’abord' : 'Plus ancien d’abord'}
          </button>
        )}
      </div>

      {lignes.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500 text-center">Aucun encaissement enregistré pour ce patient.</p>
      ) : (
        <>
          {mois.map((g) => (
            <div key={g.cle}>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-baseline justify-between gap-x-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">{g.titre}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {g.lignes.length} encaissement{g.lignes.length > 1 ? 's' : ''} ·{' '}
                  <span className="font-semibold text-emerald-700">{dt(g.total)}</span>
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.lignes.map((l) => (
                  <li key={l.cle} className="px-4 py-2.5 flex items-start gap-x-4 gap-y-1 flex-wrap text-sm">
                    <span className="w-16 shrink-0 tabular-nums text-slate-700">{court(l.jour)}</span>
                    <span className="w-24 shrink-0 text-right tabular-nums font-semibold text-emerald-700">
                      {l.montant.toFixed(2)}
                    </span>
                    <span className="flex-1 min-w-[180px] text-slate-900">
                      {l.libelle}
                      {l.dents && (
                        <span className="text-slate-500"> · dent{/[,\s]/.test(l.dents.trim()) ? 's' : ''} {l.dents}</span>
                      )}
                      <span className="text-xs text-slate-400"> (soin du {court(l.jourSoin)})</span>
                      {l.dateDuSoin && (
                        <span
                          className="badge badge-neutral ml-2"
                          title="Montant payé enregistré sans date d'encaissement : affiché à la date du soin"
                        >
                          date du soin
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 sm:text-right sm:min-w-[140px]">
                      {l.mode ? MODES[l.mode] ?? l.mode : '—'}
                      {l.cheque && (
                        <span className="block text-slate-400">
                          {[
                            l.cheque.numeroCheque && `n° ${l.cheque.numeroCheque}`,
                            l.cheque.banque,
                            l.cheque.dateEcheance && `échéance ${court(jourDe(l.cheque.dateEcheance))}`,
                            l.cheque.dateEncaissement && `encaissé le ${court(jourDe(l.cheque.dateEncaissement))}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end text-sm">
            <span className="text-slate-600">
              Total encaissé : <span className="font-semibold text-emerald-700">{dt(total)}</span>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
