import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { prescriptionsApi, Prescription, PrescriptionModele } from '../api/endpoints';
import { formatDate } from '../lib/utils';

interface PrescriptionsTabProps {
  patientId: number;
  patient?: {
    prenom: string;
    nom: string;
    numeroDossier: string;
    dateNaissance?: string;
  };
}

export function PrescriptionsTab({ patientId, patient }: PrescriptionsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prescAImprimer, setPrescAImprimer] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!prescAImprimer) return;
    const timer = setTimeout(() => {
      window.print();
    }, 100);
    const handleAfterPrint = () => setPrescAImprimer(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [prescAImprimer]);

  const { data: prescriptions = [], isLoading } = useQuery<Prescription[]>({
    queryKey: ['prescriptions', patientId],
    queryFn: () => prescriptionsApi.byPatient(patientId),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Ordonnances</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {prescriptions.length === 0
              ? 'Aucune ordonnance'
              : `${prescriptions.length} ordonnance${prescriptions.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle ordonnance
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3">Chargement...</p>
        </div>
      )}

      {!isLoading && prescriptions.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Aucune ordonnance pour ce patient</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Créer la première ordonnance
          </button>
        </div>
      )}

      {!isLoading && prescriptions.length > 0 && (
        <div className="space-y-3">
          {prescriptions.map((presc) => (
            <div key={presc.id} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">
                  {formatDate(presc.dateEmission)}
                </span>
                <button
                  onClick={() => setPrescAImprimer(presc)}
                  className="text-slate-500 hover:text-primary-600 inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>
              {presc.texteLibre && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{presc.texteLibre}</p>
              )}
              {presc.items.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {presc.items.map((item) => (
                    <li key={item.id} className="text-sm text-slate-600">
                      <span className="font-medium">{item.nomMedicament}</span> — {item.posologie}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {prescAImprimer && (
        <div className="print-area">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ordonnance</h2>
              {patient && (
                <p className="text-sm text-slate-600 mt-1">Dossier n° {patient.numeroDossier}</p>
              )}
            </div>
            <p className="text-sm text-slate-600">{formatDate(prescAImprimer.dateEmission)}</p>
          </div>

          {patient && (
            <div className="mb-8 text-sm text-slate-700">
              <p className="font-medium">
                {patient.prenom} {patient.nom}
              </p>
              {patient.dateNaissance && <p>Né(e) le {formatDate(patient.dateNaissance)}</p>}
            </div>
          )}

          {prescAImprimer.texteLibre && (
            <p className="text-sm text-slate-800 whitespace-pre-wrap mb-6">
              {prescAImprimer.texteLibre}
            </p>
          )}

          {prescAImprimer.items.length > 0 && (
            <ul className="space-y-2 mb-6">
              {prescAImprimer.items.map((item) => (
                <li key={item.id} className="text-sm text-slate-800">
                  <span className="font-medium">{item.nomMedicament}</span> — {item.posologie}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-16 flex justify-end">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-12">Signature et cachet</p>
              <div className="w-48 border-t border-slate-400"></div>
            </div>
          </div>
        </div>
      )}

      {isDialogOpen && (
        <AddPrescriptionDialog patientId={patientId} onClose={() => setIsDialogOpen(false)} />
      )}
    </div>
  );
}

function AddPrescriptionDialog({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [texteLibre, setTexteLibre] = useState('');
  const [dateEmission, setDateEmission] = useState(() => new Date().toISOString().slice(0, 10));
  const [modeleId, setModeleId] = useState('');

  const { data: modeles = [] } = useQuery<PrescriptionModele[]>({
    queryKey: ['prescription-modeles'],
    queryFn: () => prescriptionsApi.listModeles(),
  });

  const createMutation = useMutation({
    mutationFn: () => prescriptionsApi.create({ patientId, texteLibre, dateEmission }),
    onSuccess: () => {
      toast.success('Ordonnance créée');
      qc.invalidateQueries({ queryKey: ['prescriptions', patientId] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la création de l'ordonnance");
    },
  });

  const handleModeleChange = (id: string) => {
    setModeleId(id);
    const modele = modeles.find((m) => String(m.id) === id);
    if (!modele) return;
    if (texteLibre.trim() && !confirm('Remplacer le texte actuel par ce modèle ?')) return;
    setTexteLibre(modele.contenu);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Nouvelle ordonnance</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={dateEmission}
              onChange={(e) => setDateEmission(e.target.value)}
              className="input"
            />
          </div>

          {modeles.length > 0 && (
            <div>
              <label className="label">Insérer un modèle (optionnel)</label>
              <select
                value={modeleId}
                onChange={(e) => handleModeleChange(e.target.value)}
                className="input"
              >
                <option value="">— Choisir un modèle —</option>
                {modeles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Contenu de l'ordonnance</label>
            <textarea
              value={texteLibre}
              onChange={(e) => setTexteLibre(e.target.value)}
              className="input"
              rows={10}
              placeholder="Ex : Doliprane 1g, 1cp x3/j pendant 5 jours..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!texteLibre.trim() || createMutation.isPending}
            className="px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            {createMutation.isPending ? 'Création...' : "Créer l'ordonnance"}
          </button>
        </div>
      </div>
    </div>
  );
}
