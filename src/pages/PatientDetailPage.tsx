import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi, treatmentsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { ToothChart } from '@/components/patients/ToothChart';
import { calculateAge, formatDate, formatDateShort, formatMoney } from '@/lib/utils';

type Tab = 'identite' | 'soins' | 'schema' | 'finance';

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const patientId = Number(id);
  const [tab, setTab] = useState<Tab>('identite');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.get(patientId),
  });

  const { data: treatments } = useQuery({
    queryKey: ['treatments', patientId],
    queryFn: () => treatmentsApi.byPatient(patientId),
    enabled: tab === 'soins' || tab === 'finance',
  });

  const { data: finSummary } = useQuery({
    queryKey: ['finSummary', patientId],
    queryFn: () => treatmentsApi.financialSummary(patientId),
    enabled: tab === 'finance',
  });

  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.delete(patientId),
    onSuccess: () => {
      toast.success('Patient supprimé');
      qc.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
  });

  if (isLoading || !patient) return <div className="p-12"><Spinner /></div>;

  const age = calculateAge(patient.dateNaissance);

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <Link to="/patients" className="btn-ghost !p-2">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-lg font-semibold">
            {patient.prenom} {patient.nom}
          </h1>
          <p className="text-xs text-slate-500">
            Dossier N° {patient.numeroDossier}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Supprimer définitivement ce patient ?')) {
              deleteMutation.mutate();
            }
          }}
          className="btn-ghost text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        {/* Header fiche */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-5">
            <Avatar prenom={patient.prenom} nom={patient.nom} sexe={patient.sexe} size="xl" />
            <div className="flex-1">
              <h2 className="font-display text-2xl font-semibold">
                {patient.prenom} {patient.nom}
              </h2>
              <div className="text-sm text-slate-500 mt-1">
                {patient.sexe === 'F' ? 'Femme' : 'Homme'}
                {age !== null && ` · ${age} ans`}
                {patient.dateNaissance && ` · Né(e) le ${formatDateShort(patient.dateNaissance)}`}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                {patient.gsm && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} /> {patient.gsm}
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} /> {patient.email}
                  </div>
                )}
                {patient.ville && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} /> {patient.ville}
                  </div>
                )}
              </div>
              {patient.antecedents && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Antécédents :</strong> {patient.antecedents}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-4">
            <div className="flex gap-1">
              <TabBtn active={tab === 'identite'} onClick={() => setTab('identite')}>
                Identité
              </TabBtn>
              <TabBtn active={tab === 'soins'} onClick={() => setTab('soins')}>
                Soins
              </TabBtn>
              <TabBtn active={tab === 'schema'} onClick={() => setTab('schema')}>
                Schéma dentaire
              </TabBtn>
              <TabBtn active={tab === 'finance'} onClick={() => setTab('finance')}>
                Finances
              </TabBtn>
            </div>
          </div>

          <div className="p-6">
            {tab === 'identite' && <IdentiteTab patient={patient} />}
            {tab === 'soins' && <SoinsTab treatments={treatments} />}
            {tab === 'schema' && <ToothChart patientId={patientId} />}
            {tab === 'finance' && <FinanceTab summary={finSummary} treatments={treatments} />}
          </div>
        </div>
      </div>
    </>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'text-primary-500 border-primary-500'
          : 'text-slate-500 border-transparent hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function IdentiteTab({ patient }: { patient: any }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Nom" value={patient.nom} />
      <Field label="Prénom" value={patient.prenom} />
      <Field label="Date de naissance" value={formatDate(patient.dateNaissance)} />
      <Field label="Sexe" value={patient.sexe === 'F' ? 'Femme' : 'Homme'} />
      <Field label="GSM" value={patient.gsm} />
      <Field label="Email" value={patient.email} />
      <Field label="Adresse" value={patient.adresse} full />
      <Field label="Ville" value={patient.ville} />
      <Field label="Profession" value={patient.profession} />
      <Field label="Assurance" value={patient.assurance} />
      <Field label="Antécédents médicaux" value={patient.antecedents} full />
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="label">{label}</div>
      <div className="text-sm text-slate-900 py-2 px-3 bg-slate-50 rounded-md min-h-[36px]">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function SoinsTab({ treatments }: { treatments?: any[] }) {
  if (!treatments || treatments.length === 0) {
    return <p className="text-center py-8 text-sm text-slate-500">Aucun soin enregistré</p>;
  }

  return (
    <div className="space-y-3">
      {treatments.map((t) => (
        <div key={t.id} className="border border-slate-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-semibold text-sm">{formatDate(t.dateSoin)}</div>
              {t.observations && (
                <div className="text-xs text-slate-500 mt-1">{t.observations}</div>
              )}
            </div>
          </div>
          {t.acts?.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="text-left py-1">Acte</th>
                  <th className="text-left py-1">Dents</th>
                  <th className="text-right py-1">Coût</th>
                  <th className="text-right py-1">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {t.acts.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-1.5">{a.libelle}</td>
                    <td className="py-1.5 text-slate-600">{a.dents || '—'}</td>
                    <td className="py-1.5 text-right">{formatMoney(a.cout)} DT</td>
                    <td className="py-1.5 text-right text-emerald-600">
                      {formatMoney(a.montantRecu)} DT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

function FinanceTab({ summary, treatments }: { summary?: any; treatments?: any[] }) {
  if (!summary) return <Spinner />;

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border-slate-200">
          <div className="label">Total facturé</div>
          <div className="font-display text-2xl font-semibold mt-1">
            {formatMoney(summary.total)} <span className="text-sm text-slate-400">DT</span>
          </div>
        </div>
        <div className="card p-4 border-emerald-200 bg-emerald-50/50">
          <div className="label text-emerald-700">Reçu</div>
          <div className="font-display text-2xl font-semibold mt-1 text-emerald-700">
            {formatMoney(summary.recu)} <span className="text-sm text-emerald-500">DT</span>
          </div>
        </div>
        <div className="card p-4 border-slate-200">
          <div className="label">Remise</div>
          <div className="font-display text-2xl font-semibold mt-1 text-slate-500">
            {formatMoney(summary.remise)} <span className="text-sm text-slate-400">DT</span>
          </div>
        </div>
        <div className={`card p-4 ${summary.reste > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200'}`}>
          <div className={`label ${summary.reste > 0 ? 'text-rose-700' : ''}`}>
            Reste à payer
          </div>
          <div className={`font-display text-2xl font-semibold mt-1 ${summary.reste > 0 ? 'text-rose-700' : ''}`}>
            {formatMoney(summary.reste)} <span className="text-sm">DT</span>
          </div>
        </div>
      </div>

      <SoinsTab treatments={treatments} />
    </div>
  );
}
