import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { treatmentsApi } from '@/api/endpoints';

interface RecordPaymentDialogProps {
  patientId: number;
  act: { id: number; libelle: string; cout: number; montantRecu: number; remise?: number };
  onClose: () => void;
}

const PAYMENT_MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'd17', label: 'D17' },
  { value: 'virement', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' },
];

export function RecordPaymentDialog({ patientId, act, onClose }: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const reste = Number(act.cout) - Number(act.montantRecu) - Number(act.remise || 0);
  const [montant, setMontant] = useState(reste > 0 ? reste.toFixed(2) : '');
  const [modeReglement, setModeReglement] = useState('especes');

  const recordPayment = useMutation({
    mutationFn: async () => {
      const value = parseFloat(montant);
      if (!value || value <= 0) throw new Error('Montant invalide');
      if (value > reste + 0.01) {
        throw new Error(`Le montant dépasse le solde dû (${reste.toFixed(2)} DT)`);
      }
      return treatmentsApi.recordPayment(act.id, { montant: value, modeReglement });
    },
    onSuccess: () => {
      toast.success('Paiement enregistré');
      queryClient.invalidateQueries({ queryKey: ['treatments', patientId] });
      queryClient.invalidateQueries({ queryKey: ['finSummary', patientId] });
      onClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de l'enregistrement";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Enregistrer un paiement
            </h2>
            <p className="text-sm text-slate-500 mt-1">{act.libelle} — reste dû {reste.toFixed(2)} DT</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Montant encaissé (DT)</label>
            <input
              type="number" min="0" max={reste} step="0.5"
              value={montant} onChange={(e) => setMontant(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Mode de règlement</label>
            <select
              value={modeReglement} onChange={(e) => setModeReglement(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {PAYMENT_MODES.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">
            Annuler
          </button>
          <button
            onClick={() => recordPayment.mutate()}
            disabled={recordPayment.isPending}
            className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            <Save className="w-4 h-4" />
            {recordPayment.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
