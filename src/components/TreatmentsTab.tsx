import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { NewTreatmentDialog } from './NewTreatmentDialog';

interface TreatmentsTabProps {
  patientId: number;
}

interface TreatmentAct {
  id: number;
  libelle: string;
  dents?: string;
  cout: number;
  montant_recu: number;
  mode_reglement?: string;
}

interface Treatment {
  id: number;
  date_soin: string;
  observations?: string;
  acts: TreatmentAct[];
}

const PAYMENT_LABELS: Record<string, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  d17: 'D17',
  virement: 'Virement',
  cnam: 'CNAM',
};

export function TreatmentsTab({ patientId }: TreatmentsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: treatments = [], isLoading } = useQuery<Treatment[]>({
    queryKey: ['treatments', patientId],
    queryFn: async () => {
      const res = await api.get(`/patients/${patientId}/treatments`);
      return res.data;
    },
  });

  return (
    <div className="p-6">
      {/* Header avec bouton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Historique des soins</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {treatments.length === 0
              ? 'Aucun soin enregistré'
              : `${treatments.length} séance${treatments.length > 1 ? 's' : ''} de soins`}
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
        >
          <Plus className="w-4 h-4" />
          Nouveau soin
        </button>
      </div>

      {/* État de chargement */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3">Chargement des soins...</p>
        </div>
      )}

      {/* Aucun soin */}
      {!isLoading && treatments.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Aucun soin enregistré pour ce patient</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter le premier soin
          </button>
        </div>
      )}

      {/* Liste des soins */}
      {!isLoading && treatments.length > 0 && (
        <div className="space-y-4">
          {treatments.map((treatment) => {
            const totalCost = treatment.acts.reduce((s, a) => s + Number(a.cout), 0);
            const totalPaid = treatment.acts.reduce((s, a) => s + Number(a.montant_recu), 0);
            const totalDue = totalCost - totalPaid;

            return (
              <div
                key={treatment.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition"
              >
                {/* En-tête */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {format(new Date(treatment.date_soin), 'EEEE d MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {treatment.acts.length} acte{treatment.acts.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="font-semibold text-slate-900">{totalCost.toFixed(2)} DT</div>
                  </div>
                </div>

                {/* Liste des actes */}
                <div className="space-y-2">
                  {treatment.acts.map((act) => (
                    <div key={act.id} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{act.libelle}</div>
                        {act.dents && (
                          <div className="text-xs text-slate-500 mt-0.5">Dents : {act.dents}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">
                          {Number(act.cout).toFixed(2)} DT
                        </div>
                        <div className="text-xs text-slate-500">
                          {Number(act.montant_recu).toFixed(2)} DT payé
                          {act.mode_reglement && ` (${PAYMENT_LABELS[act.mode_reglement] || act.mode_reglement})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Résumé financier */}
                {(totalPaid > 0 || totalDue > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-600 font-medium">
                        Payé : {totalPaid.toFixed(2)} DT
                      </span>
                      {totalDue > 0 && (
                        <span className="text-rose-600 font-medium">
                          Dû : {totalDue.toFixed(2)} DT
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {treatment.observations && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Observations</div>
                    <div className="text-sm text-slate-700">{treatment.observations}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <NewTreatmentDialog
        patientId={patientId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
