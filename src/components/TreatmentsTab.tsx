import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Activity, Edit } from 'lucide-react';
import { format } from 'date-fns';
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

  // Totaux globaux affichés au-dessus du tableau, sur le même principe que
  // le "Payé" / "Dû" qui apparaissait auparavant séance par séance.
  const totalPaidAll = treatments.reduce(
    (sum, t) => sum + t.acts.reduce((s, a) => s + Number(a.montantRecu), 0),
    0,
  );
  const totalDueAll = treatments.reduce(
    (sum, t) =>
      sum +
      t.acts.reduce(
        (s, a) => s + Math.max(0, Number(a.cout) - Number(a.montantRecu) - Number(a.remise || 0)),
        0,
      ),
    0,
  );

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
          className="btn-primary !rounded-full !px-5 !py-2.5 shadow-sm hover:shadow"
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

      {/* Tableau des soins, façon fiche patient papier : Date / Dent / Acte / Payé / Reste */}
      {!isLoading && treatments.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {(totalPaidAll > 0.01 || totalDueAll > 0.01) && (
            <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm">
              <span className="text-emerald-600 font-medium">Payé : {totalPaidAll.toFixed(2)} DT</span>
              {totalDueAll > 0.01 && (
                <span className="text-rose-600 font-medium">Reste dû : {totalDueAll.toFixed(2)} DT</span>
              )}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 whitespace-nowrap">Date</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Dent</th>
                <th className="px-4 py-2.5">Acte</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Payé</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Reste</th>
                <th className="px-4 py-2.5 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((treatment) => {
                const isEditing = editingId === treatment.id;
                const editingActsById = new Map((editForm?.acts || []).map((a) => [a.id, a]));
                const costTooLow = isEditing ? findCostTooLow(treatment) : null;
                const receivedTooHigh = isEditing ? findReceivedTooHigh(treatment) : null;

                return (
                  <Fragment key={treatment.id}>
                    {treatment.acts.map((act, idx) => {
                      const reste = Math.max(
                        0,
                        Number(act.cout) - Number(act.montantRecu) - Number(act.remise || 0),
                      );
                      const editingAct = editingActsById.get(act.id);

                      if (isEditing && editingAct) {
                        return (
                          <tr key={act.id} className="border-b border-slate-100 bg-primary-50/30">
                            <td className="px-4 py-2 align-top whitespace-nowrap">
                              {idx === 0 && (
                                <input
                                  type="date"
                                  value={editForm?.dateSoin || ''}
                                  onChange={(e) =>
                                    setEditForm((f) => (f ? { ...f, dateSoin: e.target.value } : f))
                                  }
                                  className="input py-1 text-sm w-36"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2 align-top">
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
                                className="input text-sm w-20"
                                placeholder="11;12"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
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
                                className="input text-sm w-full"
                                placeholder="Libellé de l'acte"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
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
                                className="input text-sm text-right w-20"
                                placeholder="Payé"
                                title="Montant encaissé (DT)"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
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
                                className="input text-sm text-right w-20"
                                placeholder="Prix"
                                title="Prix total de l'acte (DT) — le Reste est recalculé automatiquement"
                              />
                            </td>
                            <td className="px-4 py-2 align-top"></td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={act.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                            {idx === 0 ? format(new Date(treatment.dateSoin), 'dd/MM/yy') : ''}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">{act.dents || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-900 font-medium">
                            {act.libelle}
                            {act.modeReglement && (
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                ({act.modeReglement === 'especes' ? 'Espèces'
                                  : act.modeReglement === 'cheque' ? 'Chèque'
                                  : act.modeReglement === 'd17' ? 'D17'
                                  : act.modeReglement === 'virement' ? 'Virement'
                                  : act.modeReglement === 'cnam' ? 'CNAM'
                                  : act.modeReglement})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-600 whitespace-nowrap">
                            {Number(act.montantRecu).toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${
                              reste > 0.01 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {reste > 0.01 ? reste.toFixed(2) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              {reste > 0.01 && (
                                <button
                                  onClick={() => setPayingAct(act)}
                                  className="text-xs font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
                                >
                                  Encaisser
                                </button>
                              )}
                              {idx === 0 && (
                                <button
                                  onClick={() => startEditing(treatment)}
                                  className="text-slate-400 hover:text-primary-600 transition"
                                  title="Modifier la séance"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {isEditing && (
                      <tr className="border-b border-slate-200 bg-primary-50/30">
                        <td colSpan={6} className="px-4 py-3">
                          <label className="label">Observations</label>
                          <textarea
                            value={editForm?.observations || ''}
                            onChange={(e) =>
                              setEditForm((f) => (f ? { ...f, observations: e.target.value } : f))
                            }
                            className="input"
                            rows={2}
                          />
                          {costTooLow && (
                            <p className="text-xs text-rose-600 mt-1.5">
                              Le prix de « {costTooLow.libelle} » ne peut pas être inférieur au montant déjà
                              encaissé ({costTooLow.montantRecu.toFixed(2)} DT).
                            </p>
                          )}
                          {receivedTooHigh && (
                            <p className="text-xs text-rose-600 mt-1.5">
                              Le montant encaissé pour « {receivedTooHigh.libelle} » ne peut pas dépasser le
                              prix ({receivedTooHigh.plafond.toFixed(2)} DT).
                            </p>
                          )}
                          <div className="flex justify-end gap-2 mt-3">
                            <button
                              onClick={cancelEditing}
                              className="btn-ghost"
                              disabled={updateMutation.isPending}
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => updateMutation.mutate()}
                              className="btn-primary"
                              disabled={updateMutation.isPending || !!costTooLow || !!receivedTooHigh}
                            >
                              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isEditing && treatment.observations && (
                      <tr className="border-b border-slate-100 last:border-0">
                        <td colSpan={6} className="px-4 py-1.5 text-xs text-slate-500 italic bg-slate-50/50">
                          {treatment.observations}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
