import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Activity, Edit, Banknote, X, Save, Trash2, Paperclip, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { treatmentsApi } from '../api/endpoints';
import { NewTreatmentDialog } from './NewTreatmentDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { VisitPaymentDialog } from './VisitPaymentDialog';
import { UploadImageDialog, useConsultations, PatientImageRow } from './PatientImagesTab';

const TYPE_PJ: Record<string, string> = {
  photo: 'Photo',
  radio: 'Radio',
  panoramique: 'Panoramique',
  scanner: 'Scanner',
  document: 'Document',
};

interface TreatmentsTabProps {
  patientId: number;
}

// Un paiement encaissé sur cet acte (bouton "Encaisser" ou saisi à la
// création du soin) — chacun a sa propre date (datePaiement), distincte de
// la date du soin (2026-09-30).
interface ActPayment {
  id: number;
  montant: number;
  datePaiement: string;
  modeReglement: string;
}

interface TreatmentAct {
  id: number;
  libelle: string;
  dents?: string;
  cout: number;
  montantRecu: number;
  remise?: number;
  modeReglement?: string;
  payments?: ActPayment[];
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
  const [isGlobalPayOpen, setIsGlobalPayOpen] = useState(false);
  // Pièces jointes par consultation (2026-10-16).
  const [attachFor, setAttachFor] = useState<Treatment | null>(null);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
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

  // Pièces jointes du patient (même cache que l'onglet « Pièces jointes »),
  // regroupées par consultation pour les afficher sous chaque séance.
  const { data: patientImages = [] } = useQuery<PatientImageRow[]>({
    queryKey: ['patientImages', patientId],
    queryFn: async () => (await api.get(`/patients/${patientId}/images`)).data,
  });
  const imagesParSeance = new Map<number, PatientImageRow[]>();
  for (const img of patientImages) {
    if (!img.treatmentId) continue;
    const list = imagesParSeance.get(img.treatmentId) || [];
    list.push(img);
    imagesParSeance.set(img.treatmentId, list);
  }
  const consultations = useConsultations(patientId);

  // Suppressions (2026-10-07) : un acte (avec ses encaissements) ou un seul
  // encaissement. Confirmation obligatoire — action définitive.
  const invalidateAfterDelete = () => {
    qc.invalidateQueries({ queryKey: ['treatments', patientId] });
    qc.invalidateQueries({ queryKey: ['finSummary', patientId] });
    qc.invalidateQueries({ queryKey: ['caisse'] });
    qc.invalidateQueries({ queryKey: ['cheques'] });
  };

  const deleteActMutation = useMutation({
    mutationFn: (actId: number) => api.delete(`/treatments/acts/${actId}`),
    onSuccess: () => {
      toast.success('Acte supprimé');
      invalidateAfterDelete();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => api.delete(`/treatments/payments/${paymentId}`),
    onSuccess: () => {
      toast.success('Encaissement supprimé');
      invalidateAfterDelete();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  function handleDeleteAct(act: TreatmentAct) {
    const paye = Number(act.montantRecu);
    const message =
      `Supprimer « ${act.libelle} » de l'historique des soins ?` +
      (paye > 0.01
        ? `\n\nSes encaissements (${paye.toFixed(2)} DT) seront aussi supprimés de la caisse.`
        : '');
    if (window.confirm(message)) deleteActMutation.mutate(act.id);
  }

  function handleDeletePayment(payment: ActPayment, act: TreatmentAct, onDeleted?: () => void) {
    const message =
      `Supprimer l'encaissement de ${Number(payment.montant).toFixed(2)} DT du ` +
      `${format(new Date(payment.datePaiement), 'dd/MM/yy')} (${act.libelle}) ?` +
      `\n\nCe montant redeviendra dû par le patient.`;
    if (window.confirm(message)) deletePaymentMutation.mutate(payment.id, { onSuccess: onDeleted });
  }

  // Suppression depuis « Modifier la séance » (2026-10-29) : le backend baisse
  // le Payé de l'acte du montant supprimé, on fait de même dans le formulaire
  // pour qu'« Enregistrer » ne remette pas l'ancien chiffre.
  function handleDeletePaymentWhileEditing(payment: ActPayment, act: TreatmentAct) {
    handleDeletePayment(payment, act, () =>
      setEditForm((f) =>
        f
          ? {
              ...f,
              acts: f.acts.map((a) =>
                a.id === act.id
                  ? { ...a, montantRecu: String(Math.max(0, Number(act.montantRecu) - Number(payment.montant))) }
                  : a,
              ),
            }
          : f,
      ),
    );
  }

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

  // Payé corrigé au crayon et encaissements enregistrés (2026-10-29, après
  // l'écart de 60 DT sur une couronne remise à 0 alors que la Caisse gardait
  // le paiement). Seulement si le Payé de l'acte est modifié, comme côté
  // backend (TreatmentsService.update, règle 3).
  function encaisseDe(act: TreatmentAct) {
    return (act.payments || []).reduce((s, p) => s + Number(p.montant), 0);
  }

  function compareToPayments(treatment: Treatment) {
    let sousEncaisse: { libelle: string; deja: number } | null = null;
    let horsCaisse: { libelle: string; ecart: number } | null = null;
    for (const editingAct of editForm?.acts ?? []) {
      const original = treatment.acts.find((a) => a.id === editingAct.id);
      const nouveau = parseFloat(editingAct.montantRecu);
      if (!original || Number.isNaN(nouveau)) continue;
      const ancien = Number(original.montantRecu);
      if (Math.abs(nouveau - ancien) < 0.0005) continue;
      const deja = encaisseDe(original);
      if (!sousEncaisse && nouveau < deja - 0.01) sousEncaisse = { libelle: original.libelle, deja };
      if (!horsCaisse && nouveau > ancien && nouveau > deja + 0.01) {
        horsCaisse = { libelle: original.libelle, ecart: nouveau - Math.max(deja, ancien) };
      }
    }
    return { sousEncaisse, horsCaisse };
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
  // Total facturé (somme des coûts des actes) — demandé par Nadia le
  // 2026-10-07 pour voir Total / Encaissé / Reste côte à côte.
  const totalBilledAll = treatments.reduce(
    (sum, t) => sum + t.acts.reduce((s, a) => s + Number(a.cout), 0),
    0,
  );
  const totalRemiseAll = treatments.reduce(
    (sum, t) => sum + t.acts.reduce((s, a) => s + Number(a.remise || 0), 0),
    0,
  );
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          onClick={() => setIsVisitOpen(true)}
          className="btn-ghost !rounded-full !px-4 !py-2.5 text-emerald-700 flex items-center gap-1.5"
          title="Le patient paie la visite avant les soins"
        >
          <Banknote className="w-4 h-4" />
          Payer la visite
        </button>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="btn-primary !rounded-full !px-5 !py-2.5 shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          Nouveau soin
        </button>
        </div>
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
          {(totalBilledAll > 0.01 || totalPaidAll > 0.01) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm">
              <span className="text-slate-700 font-medium">
                Total : {totalBilledAll.toFixed(2)} DT
              </span>
              <span className="text-emerald-600 font-medium">
                Encaissé : {totalPaidAll.toFixed(2)} DT
              </span>
              {totalRemiseAll > 0.01 && (
                <span className="text-amber-600 font-medium">
                  Remise : {totalRemiseAll.toFixed(2)} DT
                </span>
              )}
              <span className={totalDueAll > 0.01 ? 'text-rose-600 font-medium' : 'text-slate-400 font-medium'}>
                Reste : {totalDueAll.toFixed(2)} DT
              </span>
              {totalDueAll > 0.01 && (
                <button
                  onClick={() => setIsGlobalPayOpen(true)}
                  className="ml-auto px-3 py-1.5 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm hover:shadow"
                  style={{ backgroundColor: '#0e6ba8' }}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Encaisser
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 whitespace-nowrap">Date</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Dent</th>
                <th className="px-4 py-2.5">Acte</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Total</th>
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
                const { sousEncaisse, horsCaisse } = isEditing
                  ? compareToPayments(treatment)
                  : { sousEncaisse: null, horsCaisse: null };

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
                              <span className="block text-[10px] text-slate-400 mb-0.5">Prix total</span>
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
                                placeholder="Total"
                                title="Prix total de l'acte (DT)"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
                              <span className="block text-[10px] text-slate-400 mb-0.5">Encaissé</span>
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
                              {/* Tous les encaissements de l'acte, y compris le premier
                                  (masqué hors modification), supprimables (2026-10-29). */}
                              {(act.payments || []).length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {(act.payments || []).map((p) => (
                                    <li
                                      key={p.id}
                                      className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap"
                                    >
                                      {format(new Date(p.datePaiement), 'dd/MM/yy')} · {Number(p.montant).toFixed(2)}
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePaymentWhileEditing(p, act)}
                                        disabled={deletePaymentMutation.isPending}
                                        className="text-slate-400 hover:text-rose-600 disabled:opacity-50"
                                        title="Supprimer cet encaissement"
                                        aria-label={`Supprimer l'encaissement du ${format(new Date(p.datePaiement), 'dd/MM/yy')}`}
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-4 py-2 align-top text-right text-slate-400 text-sm">
                              {/* Reste = Total - Payé, recalculé automatiquement — non modifiable
                                  directement ici (2026-09-30 : Total a maintenant sa propre
                                  colonne, donc plus besoin de le détourner pour ça). */}
                              {(() => {
                                const c = parseFloat(editingAct.cout);
                                const m = parseFloat(editingAct.montantRecu);
                                const coutFinal = Number.isNaN(c) ? Number(act.cout) : c;
                                const recuFinal = Number.isNaN(m) ? Number(act.montantRecu) : m;
                                const r = Math.max(0, coutFinal - recuFinal - Number(act.remise || 0));
                                return r > 0.01 ? r.toFixed(2) : '—';
                              })()}
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
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                            {Number(act.cout).toFixed(2)}
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
                                  onClick={() => setAttachFor(treatment)}
                                  className="text-slate-400 hover:text-primary-600 transition"
                                  title="Joindre un fichier à cette consultation"
                                >
                                  <Paperclip size={14} />
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
                              <button
                                onClick={() => handleDeleteAct(act)}
                                disabled={deleteActMutation.isPending}
                                className="text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                                title="Supprimer cet acte"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Encaissements enregistrés après la création du soin (bouton
                        "Encaisser" sur un reste dû) : une ligne par paiement, avec sa
                        propre date — distincte de la date du soin ci-dessus, pour bien
                        montrer quand l'argent a réellement été reçu (2026-09-30). Le
                        tout premier paiement d'un acte (généralement saisi le jour même
                        du soin) n'est pas répété ici pour ne pas doubler la ligne. */}
                    {!isEditing &&
                      treatment.acts.flatMap((act) =>
                        (act.payments || []).slice(1).map((p) => (
                          <tr key={`pay-${p.id}`} className="border-b border-slate-100 last:border-0 bg-emerald-50/30">
                            <td className="px-4 py-1.5 whitespace-nowrap text-slate-400 text-xs">
                              {format(new Date(p.datePaiement), 'dd/MM/yy')}
                            </td>
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5 text-slate-500 text-xs italic">
                              ↳ Encaissement — {act.libelle}
                              {p.modeReglement && (
                                <span className="ml-2 text-slate-400">
                                  ({p.modeReglement === 'especes' ? 'Espèces'
                                    : p.modeReglement === 'cheque' ? 'Chèque'
                                    : p.modeReglement === 'd17' ? 'D17'
                                    : p.modeReglement === 'virement' ? 'Virement'
                                    : p.modeReglement === 'cnam' ? 'CNAM'
                                    : p.modeReglement})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5 text-right font-medium text-emerald-600 text-xs whitespace-nowrap">
                              {Number(p.montant).toFixed(2)}
                            </td>
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5">
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => handleDeletePayment(p, act)}
                                  disabled={deletePaymentMutation.isPending}
                                  className="text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                                  title="Supprimer cet encaissement"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )),
                      )}

                    {isEditing && (
                      <tr className="border-b border-slate-200 bg-primary-50/30">
                        <td colSpan={7} className="px-4 py-3">
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
                          {sousEncaisse && (
                            <p className="text-xs text-rose-600 mt-1.5">
                              {sousEncaisse.deja.toFixed(2)} DT ont déjà été encaissés pour « {sousEncaisse.libelle} ».
                              Pour annuler un encaissement, supprimez-le dans la liste sous « Encaissé » (icône
                              corbeille) : le Payé et la Caisse se mettront à jour tout seuls.
                            </p>
                          )}
                          {horsCaisse && (
                            <p className="text-xs text-amber-700 mt-1.5">
                              Les {horsCaisse.ecart.toFixed(2)} DT ajoutés à « {horsCaisse.libelle} » n'apparaîtront
                              pas dans la Caisse. Pour enregistrer un vrai paiement, utilisez « Encaisser ».
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
                              disabled={updateMutation.isPending || !!costTooLow || !!receivedTooHigh || !!sousEncaisse}
                            >
                              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isEditing && treatment.observations && (
                      <tr className="border-b border-slate-100 last:border-0">
                        <td colSpan={7} className="px-4 py-1.5 text-xs text-slate-500 italic bg-slate-50/50">
                          {treatment.observations}
                        </td>
                      </tr>
                    )}

                    {/* Pièces jointes de la consultation, avec leur date (2026-10-16). */}
                    {!isEditing && (imagesParSeance.get(treatment.id)?.length ?? 0) > 0 && (
                      <tr className="border-b border-slate-100 last:border-0 bg-sky-50/40">
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                              <Paperclip size={12} /> Pièces jointes :
                            </span>
                            {imagesParSeance.get(treatment.id)!.map((img) => (
                              <a
                                key={img.id}
                                href={img.url || undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1 pr-2.5 py-1 text-xs hover:border-primary-300 hover:shadow-sm transition"
                                title={img.observation || img.titre || TYPE_PJ[img.type] || img.type}
                              >
                                {img.mimeType?.startsWith('image/') && img.url ? (
                                  <img src={img.url} alt="" className="w-7 h-7 rounded object-cover" />
                                ) : (
                                  <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center">
                                    <FileText size={14} className="text-slate-400" />
                                  </span>
                                )}
                                <span className="text-slate-700 max-w-[160px] truncate">
                                  {img.titre || TYPE_PJ[img.type] || img.type}
                                </span>
                                <span className="text-slate-400">
                                  {format(new Date(img.datePrise || img.createdAt), 'dd/MM/yy')}
                                </span>
                              </a>
                            ))}
                            <button
                              onClick={() => setAttachFor(treatment)}
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                              <Plus size={12} /> Ajouter
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
          <p className="sm:hidden text-xs text-slate-400 py-1.5 text-center border-t border-slate-100">
            ← Faites glisser le tableau pour voir Payé / Reste →
          </p>
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

      {/* Joindre un fichier à une consultation (2026-10-16) */}
      {attachFor && (
        <UploadImageDialog
          patientId={patientId}
          consultations={consultations}
          defaultTreatmentId={attachFor.id}
          defaultDate={attachFor.dateSoin.slice(0, 10)}
          onClose={() => setAttachFor(null)}
        />
      )}

      {/* Modal encaissement de la visite (2026-10-08) */}
      {isVisitOpen && (
        <VisitPaymentDialog patientId={patientId} onClose={() => setIsVisitOpen(false)} />
      )}

      {/* Modal encaissement global (bandeau Total / Encaissé / Reste) */}
      {isGlobalPayOpen && (
        <GlobalPaymentDialog
          patientId={patientId}
          treatments={treatments}
          onClose={() => setIsGlobalPayOpen(false)}
        />
      )}
    </div>
  );
}

// ===== Encaissement global (2026-10-07, demandé par Nadia) =====
// Le patient donne une somme sur l'ensemble de ce qu'il doit : on la répartit
// sur les actes non soldés, du soin le plus ancien au plus récent, en
// réutilisant l'encaissement par acte existant (PATCH
// /treatments/acts/:id/payment) — aucune modification du backend. Chaque part
// crée donc sa propre ligne de paiement (visible dans Caisse & chèques).

const GLOBAL_PAYMENT_MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'd17', label: 'D17' },
  { value: 'virement', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function GlobalPaymentDialog({
  patientId,
  treatments,
  onClose,
}: {
  patientId: number;
  treatments: Treatment[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const unpaid = [...treatments]
    .sort(
      (a, b) =>
        new Date(a.dateSoin).getTime() - new Date(b.dateSoin).getTime() || a.id - b.id,
    )
    .flatMap((t) =>
      t.acts.map((act) => ({
        act,
        dateSoin: t.dateSoin,
        reste: round2(Number(act.cout) - Number(act.montantRecu) - Number(act.remise || 0)),
      })),
    )
    .filter((x) => x.reste > 0.005);
  const totalDue = round2(unpaid.reduce((s, x) => s + x.reste, 0));

  const [montant, setMontant] = useState(totalDue.toFixed(2));
  const [modeReglement, setModeReglement] = useState('especes');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [banque, setBanque] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const isCheque = modeReglement === 'cheque';

  // Répartition affichée en direct sous le montant.
  const value = parseFloat(montant) || 0;
  let left = round2(value);
  const allocation = unpaid
    .map((x) => {
      const part = round2(Math.min(left, x.reste));
      left = round2(left - part);
      return { ...x, part };
    })
    .filter((x) => x.part > 0);

  const pay = useMutation({
    mutationFn: async () => {
      if (!value || value <= 0) throw new Error('Montant invalide');
      if (value > totalDue + 0.01) {
        throw new Error(`Le montant dépasse le reste dû (${totalDue.toFixed(2)} DT)`);
      }
      let applied = 0;
      for (const x of allocation) {
        try {
          await treatmentsApi.recordPayment(x.act.id, {
            montant: x.part,
            modeReglement,
            ...(isCheque
              ? {
                  numeroCheque: numeroCheque.trim() || undefined,
                  banque: banque.trim() || undefined,
                  dateEcheance: dateEcheance || undefined,
                }
              : {}),
          });
          applied = round2(applied + x.part);
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'erreur';
          throw new Error(
            applied > 0
              ? `Encaissement interrompu : ${applied.toFixed(2)} DT enregistrés sur ${value.toFixed(2)} DT (${msg})`
              : msg,
          );
        }
      }
      return applied;
    },
    onSuccess: (applied) => {
      toast.success(`Encaissement de ${applied.toFixed(2)} DT enregistré`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erreur lors de l'enregistrement");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['treatments', patientId] });
      qc.invalidateQueries({ queryKey: ['finSummary', patientId] });
      qc.invalidateQueries({ queryKey: ['caisse'] });
      qc.invalidateQueries({ queryKey: ['cheques'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Encaisser
            </h2>
            <p className="text-sm text-slate-500 mt-1">Reste dû total : {totalDue.toFixed(2)} DT</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Montant encaissé (DT)</label>
            <input
              type="number" min="0" max={totalDue} step="0.5"
              value={montant} onChange={(e) => setMontant(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {value > totalDue + 0.01 && (
              <p className="text-xs text-rose-600 mt-1">Le montant dépasse le reste dû.</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Mode de règlement</label>
            <select
              value={modeReglement} onChange={(e) => setModeReglement(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {GLOBAL_PAYMENT_MODES.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          {isCheque && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">N° de chèque</label>
                  <input
                    value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)} maxLength={50}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Banque</label>
                  <input
                    value={banque} onChange={(e) => setBanque(e.target.value)} maxLength={100} placeholder="BIAT, STB…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Date d'échéance (si chèque post-daté)</label>
                <input
                  type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          )}

          {allocation.length > 0 && value <= totalDue + 0.01 && (
            <div>
              <p className="text-xs text-slate-600 mb-1.5">Répartition (du soin le plus ancien au plus récent)</p>
              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                {allocation.map((x) => (
                  <li key={x.act.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-slate-700">
                      <span className="text-slate-400 text-xs mr-2">
                        {format(new Date(x.dateSoin), 'dd/MM/yy')}
                      </span>
                      {x.act.libelle}
                      {x.act.dents ? <span className="text-slate-400 text-xs ml-1">({x.act.dents})</span> : null}
                    </span>
                    <span className="font-medium text-emerald-600 whitespace-nowrap ml-3">
                      {x.part.toFixed(2)} DT
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition">
            Annuler
          </button>
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending || !value || value <= 0 || value > totalDue + 0.01}
            className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            <Save className="w-4 h-4" />
            {pay.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
