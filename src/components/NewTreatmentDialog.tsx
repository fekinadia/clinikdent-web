import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Plus, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

interface NewTreatmentDialogProps {
  patientId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface TreatmentAct {
  libelle: string;
  dents: string;
  cout: number;
  montantRecu: number;
  modeReglement: string;
  // Actes courants (+ actes personnalisés ajoutés via "Autre") sélectionnés
  // pour cette ligne — sert uniquement à piloter le menu déroulant, `libelle`
  // (envoyé au backend) est reconstruit à partir de cette liste à chaque
  // sélection/désélection.
  selectedCommonActs: string[];
}

const COMMON_ACTS = [
  { label: 'Détartrage', cost: 90 },
  { label: 'Obturation (composite)', cost: 80 },
  { label: 'Extraction simple', cost: 60 },
  { label: 'Biopulpectomie + Obturation', cost: 180 },
  { label: 'Couronne céramo-métallique', cost: 450 },
  { label: 'Parage canalaire', cost: 90 },
  { label: 'Consultation', cost: 30 },
  { label: 'Radiographie', cost: 25 },
  { label: 'OBC', cost: 0 },
  { label: 'Polissage', cost: 0 },
  { label: 'Endo', cost: 0 },
  { label: 'Mise en forme', cost: 0 },
];

const PAYMENT_MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'd17', label: 'D17' },
  { value: 'virement', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' },
];

const emptyAct = (): TreatmentAct => ({
  libelle: '',
  dents: '',
  cout: 0,
  montantRecu: 0,
  modeReglement: 'especes',
  selectedCommonActs: [],
});

export function NewTreatmentDialog({ patientId, isOpen, onClose }: NewTreatmentDialogProps) {
  const queryClient = useQueryClient();
  const [dateSoin, setDateSoin] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [acts, setActs] = useState<TreatmentAct[]>([emptyAct()]);

  // Popover "actes courants" (sélection multiple) ouvert pour la ligne
  // d'index `openActsMenu`, ou aucun si null. Un seul ouvert à la fois.
  const [openActsMenu, setOpenActsMenu] = useState<number | null>(null);
  const [customActDrafts, setCustomActDrafts] = useState<Record<number, string>>({});
  const menuContainerRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    if (openActsMenu === null) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenActsMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActsMenu]);

  const createTreatment = useMutation({
    mutationFn: async () => {
      const validActs = acts
        .filter((a) => a.libelle.trim() !== '')
        // `selectedCommonActs` ne sert qu'à l'UI du sélecteur multiple, on ne
        // l'envoie pas au backend.
        .map(({ selectedCommonActs, ...act }) => act);
      if (validActs.length === 0) {
        throw new Error("Ajoutez au moins un acte");
      }
      return api.post('/treatments', {
        patientId,
        dateSoin,
        observations: observations || undefined,
        acts: validActs,
      });
    },
    onSuccess: () => {
      toast.success('Soin enregistré avec succès !');
      queryClient.invalidateQueries({ queryKey: ['treatments', patientId] });
      queryClient.invalidateQueries({ queryKey: ['finSummary', patientId] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', patientId] });
      onClose();
      setDateSoin(new Date().toISOString().split('T')[0]);
      setObservations('');
      setActs([emptyAct()]);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la création";
      toast.error(msg);
    },
  });

  const addAct = () => {
    setActs([...acts, emptyAct()]);
    setOpenActsMenu(null);
  };

  const removeAct = (index: number) => {
    if (acts.length === 1) return;
    setActs(acts.filter((_, i) => i !== index));
    setOpenActsMenu(null);
  };

  const updateAct = (index: number, field: keyof TreatmentAct, value: string | number) => {
    const newActs = [...acts];
    newActs[index] = { ...newActs[index], [field]: value };
    setActs(newActs);
  };

  // Coche/décoche un acte courant pour la ligne `index` : le libellé de la
  // ligne est reconstruit à partir de tous les actes sélectionnés (jointure
  // " + "), et le coût total est recalculé — sauf si le montant reçu avait
  // déjà été modifié manuellement (montantRecu ≠ cout), auquel cas on le
  // laisse tel quel pour ne pas écraser une saisie de l'utilisateur.
  const toggleCommonAct = (index: number, qa: { label: string; cost: number }) => {
    setActs((prev) => {
      const updated = [...prev];
      const row = updated[index];
      const isSelected = row.selectedCommonActs.includes(qa.label);
      const newSelected = isSelected
        ? row.selectedCommonActs.filter((l) => l !== qa.label)
        : [...row.selectedCommonActs, qa.label];
      const newCout = newSelected.reduce((sum, label) => {
        const found = COMMON_ACTS.find((a) => a.label === label);
        return sum + (found?.cost || 0);
      }, 0);
      const montantRecuWasSynced = row.montantRecu === row.cout;
      updated[index] = {
        ...row,
        selectedCommonActs: newSelected,
        libelle: newSelected.join(' + '),
        cout: newCout,
        montantRecu: montantRecuWasSynced ? newCout : row.montantRecu,
      };
      return updated;
    });
  };

  const addCustomAct = (index: number) => {
    const text = (customActDrafts[index] || '').trim();
    if (!text) return;
    setActs((prev) => {
      const row = prev[index];
      if (row.selectedCommonActs.includes(text)) return prev;
      const updated = [...prev];
      const newSelected = [...row.selectedCommonActs, text];
      updated[index] = { ...row, selectedCommonActs: newSelected, libelle: newSelected.join(' + ') };
      return updated;
    });
    setCustomActDrafts((d) => ({ ...d, [index]: '' }));
  };

  const totalCost = acts.reduce((sum, a) => sum + (Number(a.cout) || 0), 0);
  const totalPaid = acts.reduce((sum, a) => sum + (Number(a.montantRecu) || 0), 0);
  const totalDue = totalCost - totalPaid;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Nouveau soin
            </h2>
            <p className="text-sm text-slate-500 mt-1">Enregistrez les actes réalisés lors de la séance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Date du soin
            </label>
            <input
              type="date"
              value={dateSoin}
              onChange={(e) => setDateSoin(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actes réalisés
              </label>
              <button
                onClick={addAct}
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter une ligne
              </button>
            </div>

            {/* Tableau des actes de la séance, façon fiche patient papier */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5">Acte</th>
                    <th className="px-3 py-2.5 w-20">Dent</th>
                    <th className="px-3 py-2.5 w-24 text-right">Coût</th>
                    <th className="px-3 py-2.5 w-24 text-right">Payé</th>
                    <th className="px-3 py-2.5 w-32">Mode</th>
                    <th className="px-3 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {acts.map((act, index) => (
                    <tr key={index} className="border-b border-slate-100 last:border-0">
                      <td
                        className="px-3 py-2 relative"
                        ref={openActsMenu === index ? menuContainerRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenActsMenu(openActsMenu === index ? null : index)}
                          className="input py-1.5 text-sm w-full text-left flex items-center justify-between gap-2 bg-white"
                        >
                          <span
                            className={`truncate ${act.libelle ? 'text-slate-900' : 'text-slate-400'}`}
                            title={act.libelle}
                          >
                            {act.libelle || 'Sélectionner un ou plusieurs actes'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>

                        {openActsMenu === index && (
                          <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                            <p className="text-xs text-slate-500 mb-2">
                              💡 Actes courants (sélection multiple)
                            </p>
                            <div className="max-h-48 overflow-y-auto space-y-0.5 mb-3">
                              {COMMON_ACTS.map((qa) => {
                                const checked = act.selectedCommonActs.includes(qa.label);
                                return (
                                  <label
                                    key={qa.label}
                                    className="flex items-center gap-2 text-sm px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleCommonAct(index, qa)}
                                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="flex-1">{qa.label}</span>
                                    {qa.cost > 0 && (
                                      <span className="text-xs text-slate-400">{qa.cost} DT</span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                              <input
                                type="text"
                                value={customActDrafts[index] || ''}
                                onChange={(e) =>
                                  setCustomActDrafts((d) => ({ ...d, [index]: e.target.value }))
                                }
                                placeholder="Autre acte..."
                                className="input py-1 text-xs flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomAct(index);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => addCustomAct(index)}
                                className="text-xs px-2 py-1.5 rounded bg-primary-50 text-primary-700 font-medium hover:bg-primary-100 whitespace-nowrap"
                              >
                                Ajouter
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenActsMenu(null)}
                              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2 pt-2 border-t border-slate-100"
                            >
                              Fermer
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={act.dents}
                          onChange={(e) => updateAct(index, 'dents', e.target.value)}
                          placeholder="16, 26"
                          className="input py-1.5 text-sm w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={act.cout || ''}
                          onChange={(e) => updateAct(index, 'cout', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="input py-1.5 text-sm w-24 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={act.montantRecu || ''}
                          onChange={(e) => updateAct(index, 'montantRecu', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="input py-1.5 text-sm w-24 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={act.modeReglement}
                          onChange={(e) => updateAct(index, 'modeReglement', e.target.value)}
                          className="input py-1.5 text-sm w-32 bg-white"
                        >
                          {PAYMENT_MODES.map((pm) => (
                            <option key={pm.value} value={pm.value}>
                              {pm.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {acts.length > 1 && (
                          <button
                            onClick={() => removeAct(index)}
                            type="button"
                            className="text-rose-400 hover:text-rose-600"
                            aria-label="Supprimer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Observations (optionnel)
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notes cliniques, remarques..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none"
            />
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Résumé</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-lg font-semibold text-slate-900">{totalCost.toFixed(2)} DT</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Payé</div>
                <div className="text-lg font-semibold text-emerald-600">{totalPaid.toFixed(2)} DT</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Reste dû</div>
                <div className={`text-lg font-semibold ${totalDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {totalDue.toFixed(2)} DT
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
          >
            Annuler
          </button>
          <button
            onClick={() => createTreatment.mutate()}
            disabled={createTreatment.isPending}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            <Save className="w-4 h-4" />
            {createTreatment.isPending ? 'Enregistrement...' : 'Enregistrer le soin'}
          </button>
        </div>
      </div>
    </div>
  );
}
