import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Activity, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { NewTreatmentDialog } from './NewTreatmentDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';

interface TreatmentsTabProps {
  patientId: number;
}

interface TreatmentAct {
  id: number;
  libelle: string;
  dents?: string;
  cout: number;
  montantRecu: number;
  remise?: number;
  modeReglement?: string;
}

interface Treatment {
  id: number;
  dateSoin: string;
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
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [payingAct, setPayingAct] = useState<TreatmentAct | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    dateSoin: string;
    observations: string;
    acts: { id: number; libelle: string; dents: string; cout: string; montantRecu: string }[];
  } | null>(null);

  const { data: treatments = [], isLoading } = useQuery<Treatment[]>({
    queryKey: ['treatments', patientId],
    queryFn: async () => {
      const res = await api.get(`/patients/${patientId}/treatments`);
      return res.data;
    },
  });

  function startEditing(treatment: Treatment) {
    setEditingId(treatment.id);
    setEditForm({
      dateSoin: treatment.dateSoin.slice(0, 10),
      observations: treatment.observations || '',
      acts: treatment.acts.map((a) => ({
        id: a.id,
        libelle: a.libelle,
        dents: a.dents || '',
        cout: String(a.cout),
        montantRecu: String(a.montantRecu),
      })),
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(null);
  }

  // Les deux règles ci-dessous sont revalidées côté backend sur les valeurs
  // finales (voir TreatmentsService.update) — on prévient ici même, avant
  // l'envoi, pour que l'utilisateur voie tout de suite pourquoi
  // "Enregistrer" est désactivé plutôt que de découvrir l'erreur après coup.
  // Un prix corrigé en dessous du montant encaissé (final) ferait apparaître
  // un "dû" négatif ; un montant encaissé corrigé au-dessus du prix (final)
  // moins la remise ferait apparaître un trop-perçu.
  function findCostTooLow(treatment: Treatment) {
    if (!editForm) return null;
    for (const editingAct of editForm.acts) {
      const original = treatment.acts.find((a) => a.id === editingAct.id);
      if (!original) continue;
      const nouveauCout = parseFloat(editingAct.cout);
      const nouveauMontantRecu = parseFloat(editingAct.montantRecu);
      const montantRecuFinal = Number.isNaN(nouveauMontantRecu)
        ? Number(original.montantRecu)
        : nouveauMontantRecu;
      if (Number.isNaN(nouveauCout)) continue;
      if (nouveauCout < montantRecuFinal - 0.01) {
        return { libelle: original.libelle, montantRecu: montantRecuFinal };
      }
    }
    return null;
  }

  function findReceivedTooHigh(treatment: Treatment) {
    if (!editForm) return null;
    for (const editingAct of editForm.acts) {
      const original = treatment.acts.find((a) => a.id === editingAct.id);
      if (!original) continue;
      const nouveauMontantRecu = parseFloat(editingAct.montantRecu);
      const nouveauCout = parseFloat(editingAct.cout);
      const coutFinal = Number.isNaN(nouveauCout) ? Number(original.cout) : nouveauCout;
      if (Number.isNaN(nouveauMontantRecu)) continue;
      const plafond = coutFinal - Number(original.remise || 0);
      if (nouveauMontantRecu > plafond + 0.01) {
        return { libelle: original.libelle, plafond };
      }
    }
    return null;
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/treatments/${editingId}`, {
        dateSoin: editForm?.dateSoin,
        observations: editForm?.observations || undefined,
        acts: editForm?.acts.map((a) => {
          const cout = parseFloat(a.cout);
          const montantRecu = parseFloat(a.montantRecu);
          return {
            id: a.id,
            libelle: a.libelle,
            dents: a.dents,
            ...(Number.isNaN(cout) ? {} : { cout }),
            ...(Number.isNaN(montantRecu) ? {} : { montantRecu }),
          };
        }),
      }),
    onSuccess: () => {
      toast.success('Séance de soins mise à jour');
      qc.invalidateQueries({ queryKey: ['treatments', patientId] });
      cancelEditing();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Erreur lors de l'enregistrement";
      toast.error(msg);
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
            const totalPaid = treatment.acts.reduce((s, a) => s + Number(a.montantRecu), 0);
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
                      {editingId === treatment.id ? (
                        <input
                          type="date"
                          value={editForm?.dateSoin || ''}
                          onChange={(e) =>
                            setEditForm((f) => (f ? { ...f, dateSoin: e.target.value } : f))
                          }
                          className="input py-1 text-sm"
                        />
                      ) : (
                        <div className="font-semibold text-slate-900">
                          {format(new Date(treatment.dateSoin), 'EEEE d MMMM yyyy', { locale: fr })}
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        {treatment.acts.length} acte{treatment.acts.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="font-semibold text-slate-900">{totalCost.toFixed(2)} DT</div>
                    </div>
                    {editingId !== treatment.id && (
                      <button
                        onClick={() => startEditing(treatment)}
                        className="text-slate-400 hover:text-primary-600 transition"
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Liste des actes */}
                <div className="space-y-2">
                  {treatment.acts.map((act) => {
                    const reste = Number(act.cout) - Number(act.montantRecu) - Number(act.remise || 0);
                    const editingAct = editForm?.acts.find((a) => a.id === act.id);
                    if (editingId === treatment.id && editingAct) {
                      const nouveauCout = parseFloat(editingAct.cout);
                      const nouveauMontantRecu = parseFloat(editingAct.montantRecu);
                      const montantRecuFinal = Number.isNaN(nouveauMontantRecu)
                        ? Number(act.montantRecu)
                        : nouveauMontantRecu;
                      const coutFinal = Number.isNaN(nouveauCout) ? Number(act.cout) : nouveauCout;
                      const plafondEncaisse = coutFinal - Number(act.remise || 0);
                      const coutTropBas =
                        !Number.isNaN(nouveauCout) && nouveauCout < montantRecuFinal - 0.01;
                      const montantTropHaut =
                        !Number.isNaN(nouveauMontantRecu) &&
                        nouveauMontantRecu > plafondEncaisse + 0.01;
                      return (
                        <div key={act.id} className="py-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingAct.libelle}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f
                                    ? {
                                        ...f,
                                        acts: f.acts.map((a) =>
                                          a.id === act.id ? { ...a, libelle: e.target.value } : a,
                                        ),
                                      }
                                    : f,
                                )
                              }
                              className="input text-sm flex-1"
                              placeholder="Libellé de l'acte"
                            />
                            <div className="w-24">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={editingAct.cout}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          acts: f.acts.map((a) =>
                                            a.id === act.id ? { ...a, cout: e.target.value } : a,
                                          ),
                                        }
                                      : f,
                                  )
                                }
                                className={`input text-sm text-right ${coutTropBas ? 'border-rose-400' : ''}`}
                                placeholder="Prix (DT)"
                                title="Prix de l'acte (DT)"
                              />
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={editingAct.montantRecu}
                                onChange={(e) =>
                                  setEditForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          acts: f.acts.map((a) =>
                                            a.id === act.id ? { ...a, montantRecu: e.target.value } : a,
                                          ),
                                        }
                                      : f,
                                  )
                                }
                                className={`input text-sm text-right ${montantTropHaut ? 'border-rose-400' : ''}`}
                                placeholder="Payé (DT)"
                                title="Montant encaissé (DT)"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={editingAct.dents}
                            onChange={(e) =>
                              setEditForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      acts: f.acts.map((a) =>
                                        a.id === act.id ? { ...a, dents: e.target.value } : a,
                                      ),
                                    }
                                  : f,
                              )
                            }
                            className="input text-sm"
                            placeholder="Dents concernées (ex : 11;12;13)"
                          />
                          {coutTropBas && (
                            <p className="text-xs text-rose-600">
                              Le prix ne peut pas être inférieur au montant encaissé ({montantRecuFinal.toFixed(2)} DT).
                            </p>
                          )}
                          {montantTropHaut && (
                            <p className="text-xs text-rose-600">
                              Le montant encaissé ne peut pas dépasser le prix{Number(act.remise || 0) > 0 ? ' moins la remise' : ''} ({plafondEncaisse.toFixed(2)} DT).
                            </p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={act.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{act.libelle}</div>
                          {act.dents && (
                            <div className="text-xs text-slate-500 mt-0.5">Dents : {act.dents}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">
                              {Number(act.cout).toFixed(2)} DT
                            </div>
                            <div className="text-xs text-slate-500">
                              {Number(act.montantRecu).toFixed(2)} DT payé
                              {act.modeReglement && ` (${PAYMENT_LABELS[act.modeReglement] || act.modeReglement})`}
                            </div>
                          </div>
                          {reste > 0.01 && (
                            <button
                              onClick={() => setPayingAct(act)}
                              className="px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition whitespace-nowrap"
                            >
                              Encaisser
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                {editingId === treatment.id ? (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <label className="label">Observations</label>
                    <textarea
                      value={editForm?.observations || ''}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, observations: e.target.value } : f))}
                      className="input"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button onClick={cancelEditing} className="btn-ghost" disabled={updateMutation.isPending}>
                        Annuler
                      </button>
                      <button
                        onClick={() => updateMutation.mutate()}
                        className="btn-primary"
                        disabled={
                          updateMutation.isPending ||
                          !!findCostTooLow(treatment) ||
                          !!findReceivedTooHigh(treatment)
                        }
                        title={
                          findCostTooLow(treatment)
                            ? 'Corrigez le prix trop bas avant d\'enregistrer'
                            : findReceivedTooHigh(treatment)
                              ? 'Corrigez le montant encaissé trop élevé avant d\'enregistrer'
                              : undefined
                        }
                      >
                        {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  treatment.observations && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">Observations</div>
                      <div className="text-sm text-slate-700">{treatment.observations}</div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nouveau soin */}
      <NewTreatmentDialog
        patientId={patientId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />

      {/* Modal encaissement */}
      {payingAct && (
        <RecordPaymentDialog
          key={payingAct.id}
          patientId={patientId}
          act={payingAct}
          onClose={() => setPayingAct(null)}
        />
      )}
    </div>
  );
}
