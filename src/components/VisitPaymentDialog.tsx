import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

// Encaissement de la visite (2026-10-08, demandé par Nadia) : le patient
// arrive au cabinet et paie la visite AVANT les soins. On enregistre une
// séance d'un seul acte « Visite », payée en totalité — via la création de
// soin existante (POST /treatments), qui crée aussi la ligne de paiement :
// elle apparaît donc dans l'historique des soins, la Caisse du jour et les
// totaux encaissés, sans changement côté serveur.

// Dernier prix de visite saisi, mémorisé sur ce navigateur pour pré-remplir.
const PRIX_VISITE_KEY = 'clinikdent_prix_visite';

// Seuls modes acceptés par la création de soin côté serveur.
const MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
];

function lirePrixMemorise(): string {
  try {
    return localStorage.getItem(PRIX_VISITE_KEY) || '';
  } catch {
    return '';
  }
}

function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface VisitPaymentDialogProps {
  patientId: number;
  patientName?: string;
  appointmentId?: number;
  onClose: () => void;
  onPaid?: () => void;
}

export function VisitPaymentDialog({
  patientId,
  patientName,
  appointmentId,
  onClose,
  onPaid,
}: VisitPaymentDialogProps) {
  const qc = useQueryClient();
  const [montant, setMontant] = useState(lirePrixMemorise());
  const [modeReglement, setModeReglement] = useState('especes');

  const pay = useMutation({
    mutationFn: async () => {
      const value = parseFloat(montant);
      if (!value || value <= 0) throw new Error('Indiquez le prix de la visite');
      await api.post('/treatments', {
        patientId,
        ...(appointmentId ? { appointmentId } : {}),
        dateSoin: todayIso(),
        acts: [{ libelle: 'Visite', cout: value, montantRecu: value, modeReglement }],
      });
      try {
        localStorage.setItem(PRIX_VISITE_KEY, String(value));
      } catch {
        /* navigateur sans stockage : on ne mémorise simplement pas le prix */
      }
      return value;
    },
    onSuccess: (value) => {
      toast.success(`Visite encaissée : ${value.toFixed(2)} DT`);
      qc.invalidateQueries({ queryKey: ['treatments', patientId] });
      qc.invalidateQueries({ queryKey: ['finSummary', patientId] });
      qc.invalidateQueries({ queryKey: ['caisse'] });
      onPaid?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Erreur lors de l'enregistrement");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Payer la visite
            </h2>
            {patientName && <p className="text-sm text-slate-500 mt-1">{patientName}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Prix de la visite (DT)</label>
            <input
              type="number" min="0" step="0.5" autoFocus
              value={montant} onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex : 30"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Mode de règlement</label>
            <select
              value={modeReglement} onChange={(e) => setModeReglement(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            Ajoute une ligne « Visite » payée dans l'historique des soins, et dans la caisse du jour.
          </p>
        </div>
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">
            Annuler
          </button>
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending || !(parseFloat(montant) > 0)}
            className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            <Save className="w-4 h-4" />
            {pay.isPending ? 'Enregistrement...' : 'Encaisser'}
          </button>
        </div>
      </div>
    </div>
  );
}
