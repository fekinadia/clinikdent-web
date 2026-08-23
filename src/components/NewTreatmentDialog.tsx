import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Plus, Trash2 } from 'lucide-react';
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
];

const PAYMENT_MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'd17', label: 'D17' },
  { value: 'virement', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' },
];

export function NewTreatmentDialog({ patientId, isOpen, onClose }: NewTreatmentDialogProps) {
  const queryClient = useQueryClient();
  const [dateSoin, setDateSoin] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [acts, setActs] = useState<TreatmentAct[]>([
    { libelle: '', dents: '', cout: 0, montantRecu: 0, modeReglement: 'especes' },
  ]);

  const createTreatment = useMutation({
    mutationFn: async () => {
      const validActs = acts.filter((a) => a.libelle.trim() !== '');
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
      setActs([{ libelle: '', dents: '', cout: 0, montantRecu: 0, modeReglement: 'especes' }]);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la création";
      toast.error(msg);
    },
  });

  const addAct = () => {
    setActs([...acts, { libelle: '', dents: '', cout: 0, montantRecu: 0, modeReglement: 'especes' }]);
  };

  const removeAct = (index: number) => {
    if (acts.length === 1) return;
    setActs(acts.filter((_, i) => i !== index));
  };

  const updateAct = (index: number, field: keyof TreatmentAct, value: string | number) => {
    const newActs = [...acts];
    newActs[index] = { ...newActs[index], [field]: value };
    setActs(newActs);
  };

  const selectQuickAct = (index: number, act: { label: string; cost: number }) => {
    const newActs = [...acts];
    newActs[index] = {
      ...newActs[index],
      libelle: act.label,
      cout: act.cost,
      montantRecu: act.cost,
    };
    setActs(newActs);
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
                Ajouter un acte
              </button>
            </div>

            <div className="space-y-3">
              {acts.map((act, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400">ACTE #{index + 1}</span>
                    {acts.length > 1 && (
                      <button
                        onClick={() => removeAct(index)}
                        type="button"
                        className="text-rose-500 hover:text-rose-700"
                        aria-label="Supprimer cet acte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions rapides EN PREMIER */}
                  <div>
                    <label className="block text-xs text-slate-600 mb-2">
                      💡 Actes courants (clique pour remplir libellé + coût)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_ACTS.map((qa) => {
                        const isSelected = act.libelle === qa.label;
                        return (
                          <button
                            key={qa.label}
                            type="button"
                            onClick={() => selectQuickAct(index, qa)}
                            className="text-xs px-3 py-1.5 rounded-full border transition font-medium"
                            style={
                              isSelected
                                ? { backgroundColor: '#dbeafe', borderColor: '#0e6ba8', color: '#0e6ba8' }
                                : { backgroundColor: 'white', borderColor: '#e2e8f0', color: '#334155' }
                            }
                          >
                            {qa.label}
                            <span className="ml-1 text-slate-400">· {qa.cost} DT</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Libellé de l'acte</label>
                    <input
                      type="text"
                      value={act.libelle}
                      onChange={(e) => updateAct(index, 'libelle', e.target.value)}
                      placeholder="Sélectionne un acte courant ci-dessus, ou tape le tien"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Dents concernées</label>
                      <input
                        type="text"
                        value={act.dents}
                        onChange={(e) => updateAct(index, 'dents', e.target.value)}
                        placeholder="Ex: 16, 26, 36"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Mode de règlement</label>
                      <select
                        value={act.modeReglement}
                        onChange={(e) => updateAct(index, 'modeReglement', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                      >
                        {PAYMENT_MODES.map((pm) => (
                          <option key={pm.value} value={pm.value}>
                            {pm.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Coût (DT)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={act.cout || ''}
                        onChange={(e) => updateAct(index, 'cout', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Montant reçu (DT)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={act.montantRecu || ''}
                        onChange={(e) => updateAct(index, 'montantRecu', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
