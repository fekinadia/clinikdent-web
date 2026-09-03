import { useParams, Link, useNavigate } from 'react-router-dom';
import { PatientImagesTab } from '../components/PatientImagesTab';
import { RemindersTab } from '../components/RemindersTab';
import { PrescriptionsTab } from '../components/PrescriptionsTab';
import { TreatmentsTab } from '../components/TreatmentsTab';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi, treatmentsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { ToothChart } from '@/components/patients/ToothChart';
import { calculateAge, formatDate, formatDateShort, formatMoney } from '@/lib/utils';

// Masqué temporairement (Nadia, 2026-08-29) : à la demande de Nadia, l'onglet Ordonnances
// est retiré de la fiche patient (et du menu). Fonctionnalité et données intactes.
const ORDONNANCES_TAB_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-30) : à la demande de Nadia, en attendant de
// régler la question du statut professionnel (patente / auto-entrepreneur) nécessaire
// pour l'envoi de SMS. Fonctionnalité et données intactes, juste retiré de la fiche patient.
const RAPPELS_TAB_VISIBLE = false;

type Tab = 'identite' | 'soins' | 'schema' | 'finance' | 'images' | 'rappels' | 'ordonnances';

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
    enabled: tab === 'finance',
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
                           <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
                {patient.prenom} {patient.nom}
                {patient.estProspect && (
                  <span className="badge badge-warning">Prospect</span>
                )}
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
              <TabBtn active={tab === 'images'} onClick={() => setTab('images')}>Pièces jointes</TabBtn>
{RAPPELS_TAB_VISIBLE && (
                <TabBtn active={tab === 'rappels'} onClick={() => setTab('rappels')}>Rappels</TabBtn>
              )}
{ORDONNANCES_TAB_VISIBLE && (
                <TabBtn active={tab === 'ordonnances'} onClick={() => setTab('ordonnances')}>Ordonnances</TabBtn>
              )}
            </div>
          </div>

          <div className="p-6">
            {tab === 'identite' && <IdentiteTab patient={patient} />}
            {tab === 'soins' && <TreatmentsTab patientId={patientId} />}
            {tab === 'schema' && <ToothChart patientId={patientId} />}
            {tab === 'finance' && <FinanceTab summary={finSummary} treatments={treatments} patientId={patientId} />}
            {tab === 'images' && <PatientImagesTab patientId={patientId} />}
{tab === 'rappels' && <RemindersTab patientId={patientId} />}
{tab === 'ordonnances' && <PrescriptionsTab patientId={patientId} patient={patient} />}
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

function patientToFormState(patient: any) {
  return {
    numeroDossier: patient.numeroDossier || '',
    nom: patient.nom || '',
    prenom: patient.prenom || '',
    dateNaissance: patient.dateNaissance ? String(patient.dateNaissance).slice(0, 10) : '',
    sexe: (patient.sexe || 'F') as 'M' | 'F',
    gsm: patient.gsm || '',
    email: patient.email || '',
    adresse: patient.adresse || '',
    ville: patient.ville || '',
    profession: patient.profession || '',
    assurance: patient.assurance || '',
    antecedents: patient.antecedents || '',
    reseauSocial: patient.reseauSocial || '',
  };
}

function IdentiteTab({ patient }: { patient: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => patientToFormState(patient));

  const mutation = useMutation({
    mutationFn: () =>
      patientsApi.update(patient.id, {
        ...form,
        // Même contrainte que la création : le backend rejette une chaîne vide
        // pour dateNaissance (@IsDateString()) et email (@IsEmail()), undefined est accepté.
        dateNaissance: form.dateNaissance || undefined,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      toast.success('Fiche patient mise à jour');
      qc.invalidateQueries({ queryKey: ['patient', patient.id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur lors de l'enregistrement"),
  });

  function startEditing() {
    setForm(patientToFormState(patient));
    setEditing(true);
  }

  if (!editing) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button className="btn-ghost inline-flex items-center gap-1.5" onClick={startEditing}>
            <Edit size={14} /> Modifier
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="N° de dossier" value={patient.numeroDossier} />
          <Field label="Nom" value={patient.nom} />
          <Field label="Prénom" value={patient.prenom} />
          <Field label="Date de naissance" value={formatDate(patient.dateNaissance)} />
          <Field label="Sexe" value={patient.sexe === 'F' ? 'Femme' : 'Homme'} />
          <Field label="GSM" value={patient.gsm} />
          <Field label="Email" value={patient.email} />
          <Field label="Réseau social" value={patient.reseauSocial} />
          <Field label="Adresse" value={patient.adresse} full />
          <Field label="Ville" value={patient.ville} />
          <Field label="Profession" value={patient.profession} />
          <Field label="Assurance" value={patient.assurance} />
          <Field label="Antécédents médicaux" value={patient.antecedents} full />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">N° de dossier</label>
          <input className="input" required maxLength={20} value={form.numeroDossier}
            onChange={(e) => setForm({ ...form, numeroDossier: e.target.value })} />
        </div>
        <div>
          <label className="label">Nom</label>
          <input className="input" value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        </div>
        <div>
          <label className="label">Prénom</label>
          <input className="input" value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
        </div>
        <div>
          <label className="label">Date de naissance</label>
          <input type="date" className="input" value={form.dateNaissance}
            onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} />
        </div>
        <div>
          <label className="label">Sexe</label>
          <select className="input" value={form.sexe}
            onChange={(e) => setForm({ ...form, sexe: e.target.value as 'M' | 'F' })}>
            <option value="F">Femme</option>
            <option value="M">Homme</option>
          </select>
        </div>
        <div>
          <label className="label">GSM</label>
          <input className="input" value={form.gsm}
            onChange={(e) => setForm({ ...form, gsm: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Réseau social</label>
          <input className="input" placeholder="Lien Facebook / Instagram..." value={form.reseauSocial}
            onChange={(e) => setForm({ ...form, reseauSocial: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label">Adresse</label>
          <input className="input" value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
        </div>
        <div>
          <label className="label">Ville</label>
          <input className="input" value={form.ville}
            onChange={(e) => setForm({ ...form, ville: e.target.value })} />
        </div>
        <div>
          <label className="label">Profession</label>
          <input className="input" value={form.profession}
            onChange={(e) => setForm({ ...form, profession: e.target.value })} />
        </div>
        <div>
          <label className="label">Assurance</label>
          <input className="input" value={form.assurance}
            onChange={(e) => setForm({ ...form, assurance: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label">Antécédents médicaux</label>
          <textarea className="input" rows={3} value={form.antecedents}
            onChange={(e) => setForm({ ...form, antecedents: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-ghost" onClick={() => setEditing(false)} disabled={mutation.isPending}>
          Annuler
        </button>
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size={16} className="text-white" /> : 'Enregistrer'}
        </button>
      </div>
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

function FinanceTab({ summary, treatments, patientId }: { summary?: any; treatments?: any[]; patientId: number }) {
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

      <TreatmentsTab patientId={patientId} />
    </div>
  );
}
