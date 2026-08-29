import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wallet, TrendingUp, AlertTriangle, Users, MessageCircle, Download } from 'lucide-react';
import {
  financeApi,
  remindersApi,
  FinanceOverview,
  UnpaidPatient,
  FinancePayment,
} from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney, formatDateShort } from '@/lib/utils';

const PERIODES = [
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
];

function buildRelanceWhatsAppLink(gsm: string, prenom: string, reste: number) {
  let digits = gsm.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `216${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `216${digits}`;

  const message = encodeURIComponent(
    `Bonjour ${prenom}, nous vous rappelons qu'un solde de ${formatMoney(reste)} DT reste dû sur votre compte. Merci de bien vouloir régulariser votre situation.`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(';'),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FinancePage() {
  const [months, setMonths] = useState(12);
  const [tab, setTab] = useState<'impayes' | 'encaissements'>('impayes');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const qc = useQueryClient();

  const { data: overview, isLoading: loadingOverview } = useQuery<FinanceOverview>({
    queryKey: ['finance-overview', months],
    queryFn: () => financeApi.getOverview(months),
  });

  const { data: unpaid, isLoading: loadingUnpaid } = useQuery<UnpaidPatient[]>({
    queryKey: ['finance-unpaid'],
    queryFn: () => financeApi.listUnpaid(),
    enabled: tab === 'impayes',
  });

  const { data: payments, isLoading: loadingPayments } = useQuery<FinancePayment[]>({
    queryKey: ['finance-payments', from, to],
    queryFn: () => financeApi.listPayments({ from: from || undefined, to: to || undefined }),
    enabled: tab === 'encaissements',
  });

  const relanceMutation = useMutation({
    mutationFn: (patient: UnpaidPatient) =>
      remindersApi.create({
        patientId: patient.patientId,
        dateRappel: new Date().toISOString(),
        note: `Relance impayé : ${formatMoney(patient.reste)} DT restant dû`,
      }),
    onSuccess: () => {
      toast.success('Rappel de relance créé');
      qc.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => toast.error("Impossible de créer le rappel"),
  });

  function handleRelance(patient: UnpaidPatient) {
    if (patient.gsm) {
      window.open(buildRelanceWhatsAppLink(patient.gsm, patient.prenom, patient.reste), '_blank');
    }
    relanceMutation.mutate(patient);
  }

  function handleExportCsv() {
    if (!payments || payments.length === 0) return;
    const rows = [
      ['Date', 'Patient', 'N° dossier', 'Montant (DT)', 'Mode de règlement'],
      ...payments.map((p) => [
        formatDateShort(p.datePaiement),
        `${p.prenomPatient} ${p.nomPatient}`,
        p.numeroDossier,
        String(p.montant),
        p.modeReglement,
      ]),
    ];
    downloadCsv(`encaissements_${from || 'debut'}_${to || 'auj'}.csv`, rows);
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <Wallet size={20} className="text-primary-500" />
            Facturation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Encaissements et suivi des impayés</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              onClick={() => setMonths(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                months === p.value ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loadingOverview ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label={`Encaissé (${months} mois)`}
              value={`${formatMoney(overview?.totalEncaisse || 0)} DT`}
              icon={<TrendingUp size={18} className="text-emerald-600" />}
              color="bg-emerald-50"
            />
            <KpiCard
              label="Total impayé"
              value={`${formatMoney(overview?.totalImpaye || 0)} DT`}
              icon={<AlertTriangle size={18} className="text-rose-600" />}
              color="bg-rose-50"
            />
            <KpiCard
              label="Patients avec impayé"
              value={overview?.nbPatientsImpaye || 0}
              icon={<Users size={18} className="text-amber-600" />}
              color="bg-amber-50"
            />
          </div>
        )}

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('impayes')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              tab === 'impayes' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Impayés
          </button>
          <button
            onClick={() => setTab('encaissements')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
              tab === 'encaissements' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Encaissements
          </button>
        </div>

        {tab === 'impayes' && (
          <div className="card">
            {loadingUnpaid ? (
              <div className="p-12">
                <Spinner />
              </div>
            ) : !unpaid || unpaid.length === 0 ? (
              <EmptyState
                icon={<Wallet size={48} />}
                title="Aucun impayé"
                description="Tous les patients sont à jour dans leurs paiements."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium text-right">Total soins</th>
                      <th className="px-4 py-3 font-medium text-right">Reçu</th>
                      <th className="px-4 py-3 font-medium text-right">Remise</th>
                      <th className="px-4 py-3 font-medium text-right">Reste dû</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaid.map((p) => (
                      <tr key={p.patientId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar prenom={p.prenom} nom={p.nom} size="sm" />
                            <div className="min-w-0">
                              <Link
                                to={`/patients/${p.patientId}`}
                                className="font-medium text-slate-900 hover:text-primary-600 truncate block"
                              >
                                {p.prenom} {p.nom}
                              </Link>
                              <div className="text-xs text-slate-400">{p.numeroDossier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatMoney(p.total)} DT</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatMoney(p.recu)} DT</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatMoney(p.remise)} DT</td>
                        <td className="px-4 py-3 text-right">
                          <span className="badge badge-danger">{formatMoney(p.reste)} DT</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRelance(p)}
                            disabled={relanceMutation.isPending}
                            className="btn-ghost text-xs"
                          >
                            <MessageCircle size={14} />
                            Relancer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'encaissements' && (
          <div className="space-y-3">
            <div className="card p-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Du</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Au</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
              </div>
              <button
                onClick={handleExportCsv}
                disabled={!payments || payments.length === 0}
                className="btn-primary ml-auto"
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>

            <div className="card">
              {loadingPayments ? (
                <div className="p-12">
                  <Spinner />
                </div>
              ) : !payments || payments.length === 0 ? (
                <EmptyState
                  icon={<Wallet size={48} />}
                  title="Aucun encaissement"
                  description="Aucun paiement enregistré sur cette période."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Patient</th>
                        <th className="px-4 py-3 font-medium">Mode</th>
                        <th className="px-4 py-3 font-medium text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {formatDateShort(p.datePaiement)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/patients/${p.patientId}`}
                              className="font-medium text-slate-900 hover:text-primary-600"
                            >
                              {p.prenomPatient} {p.nomPatient}
                            </Link>
                            <div className="text-xs text-slate-400">{p.numeroDossier}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 capitalize">{p.modeReglement}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatMoney(p.montant)} DT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-display font-semibold text-slate-900">{value}</div>
    </div>
  );
}
