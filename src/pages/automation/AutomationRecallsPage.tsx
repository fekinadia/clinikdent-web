import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X, Trash2, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { recallsApi, Recall } from '@/api/endpoints';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort } from '@/lib/utils';

const STATUT_BADGE: Record<Recall['statut'], { label: string; className: string }> = {
  a_venir: { label: 'À venir', className: 'bg-slate-100 text-slate-600' },
  du: { label: 'Dû', className: 'badge-warning' },
  envoye: { label: 'Envoyé', className: 'badge-info' },
  converti: { label: 'Converti', className: 'badge-success' },
  annule: { label: 'Annulé', className: 'bg-slate-100 text-slate-500' },
};

const FILTER_OPTIONS: { value: Recall['statut'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'a_venir', label: 'À venir' },
  { value: 'du', label: 'Dû' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'converti', label: 'Converti' },
  { value: 'annule', label: 'Annulé' },
];

const RECALL_MONTHS_OPTIONS = [1, 3, 6, 12];

function getPatient(recall: Recall): { id: number; nom: string; prenom: string } | null {
  const r: any = recall;
  return r.patient ?? null;
}

export function AutomationRecallsPage() {
  const qc = useQueryClient();
  const [statutFilter, setStatutFilter] = useState<Recall['statut'] | 'all'>('all');

  const { data: recalls = [], isLoading } = useQuery<Recall[]>({
    queryKey: ['recalls', statutFilter],
    queryFn: () => recallsApi.list(statutFilter === 'all' ? undefined : statutFilter),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [formMode, setFormMode] = useState<'mois' | 'custom'>('mois');
  const [formMois, setFormMois] = useState(6);
  const [formDateEcheance, setFormDateEcheance] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function openCreateModal() {
    setFormPatientId('');
    setFormMode('mois');
    setFormMois(6);
    setFormDateEcheance('');
    setIsModalOpen(true);
  }

  const createMutation = useMutation({
    mutationFn: (data: { patientId: number; typeRecallMois?: number; dateEcheance?: string }) =>
      recallsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall créé');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la création du recall'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => recallsApi.update(id, { statut: 'annule' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall annulé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Erreur lors de l'annulation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recallsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall supprimé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la suppression'),
    onSettled: () => setConfirmDeleteId(null),
  });

  function handleDeleteClick(id: number) {
    if (confirmDeleteId === id) {
      deleteMutation.mutate(id);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function handleSubmit() {
    const patientId = Number(formPatientId);
    if (!patientId) return;
    if (formMode === 'mois') {
      createMutation.mutate({ patientId, typeRecallMois: formMois });
    } else {
      if (!formDateEcheance) return;
      createMutation.mutate({ patientId, dateEcheance: formDateEcheance });
    }
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Recalls</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-base font-semibold text-slate-900">Recalls d'automatisation</h2>
            <button onClick={openCreateModal} className="btn-primary">
              <Plus size={16} />
              Nouveau recall
            </button>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatutFilter(opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  statutFilter === opt.value ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : recalls.length === 0 ? (
            <EmptyState
              icon={<RotateCcw size={48} />}
              title="Aucun recall pour l'instant"
              description="Créez un recall manuel ou attendez qu'un recall automatique soit programmé."
            />
          ) : (
            <div className="space-y-3">
              {recalls.map((recall) => {
                const badge = STATUT_BADGE[recall.statut];
                const patient = getPatient(recall);
                return (
                  <div key={recall.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {patient ? (
                            <Link
                              to={`/patients/${patient.id}`}
                              className="font-medium text-sm text-slate-900 hover:text-primary-600"
                            >
                              {patient.prenom} {patient.nom}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm text-slate-400">Patient #{recall.patientId}</span>
                          )}
                          <span className={clsx('badge', badge.className)}>{badge.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5">
                          Dernière visite : {recall.dateDerniereVisite ? formatDateShort(recall.dateDerniereVisite) : '—'}
                          <span className="text-slate-400"> · Échéance : {formatDateShort(recall.dateEcheance)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {recall.statut !== 'converti' && recall.statut !== 'annule' && (
                          <button
                            onClick={() => cancelMutation.mutate(recall.id)}
                            disabled={cancelMutation.isPending}
                            className="btn-ghost !px-2 !py-2 text-xs"
                            title="Annuler"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(recall.id)}
                          className={clsx('btn-ghost !px-2 !py-2', confirmDeleteId === recall.id && 'text-rose-600')}
                          title={confirmDeleteId === recall.id ? 'Cliquer à nouveau pour confirmer' : 'Supprimer'}
                        >
                          {confirmDeleteId === recall.id ? (
                            <span className="text-xs font-medium px-1">Confirmer ?</span>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Nouveau recall</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Patient (ID)</label>
                <input
                  type="number"
                  className="input"
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  placeholder="Ex : 42"
                />
              </div>
              <div>
                <label className="label">Échéance</label>
                <select
                  className="input"
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value as 'mois' | 'custom')}
                >
                  <option value="mois">Délai en mois</option>
                  <option value="custom">Date personnalisée</option>
                </select>
              </div>
              {formMode === 'mois' ? (
                <div>
                  <label className="label">Recall dans</label>
                  <select className="input" value={formMois} onChange={(e) => setFormMois(Number(e.target.value))}>
                    {RECALL_MONTHS_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} mois
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Date d'échéance</label>
                  <input
                    type="date"
                    className="input"
                    value={formDateEcheance}
                    onChange={(e) => setFormDateEcheance(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost">
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formPatientId || createMutation.isPending || (formMode === 'custom' && !formDateEcheance)}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Création...' : 'Créer le recall'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
