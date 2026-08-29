import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { automationApi, AutomationSettings, whatsappApi, WhatsAppTemplate } from '@/api/endpoints';

const APPROVAL_BADGE: Record<WhatsAppTemplate['statutApprobation'], { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-slate-100 text-slate-600' },
  en_attente: { label: "En attente d'approbation", className: 'bg-amber-50 text-amber-700' },
  approuve: { label: 'Approuvé', className: 'bg-emerald-50 text-emerald-700' },
  rejete: { label: 'Rejeté', className: 'bg-rose-50 text-rose-700' },
};

const FILTER_OPTIONS: { value: WhatsAppTemplate['type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'reminder', label: 'Rappel de rendez-vous' },
  { value: 'recall', label: 'Recall' },
  { value: 'no_show', label: 'No-Show' },
];

const TYPE_LABELS: Record<WhatsAppTemplate['type'], string> = {
  reminder: 'Rappel de rendez-vous',
  recall: 'Recall',
  no_show: 'No-Show',
};

const RECALL_MONTHS_OPTIONS = [1, 3, 6, 12];

const TEMPLATE_VARIABLES = ['{{prenom}}', '{{nom}}', '{{cabinet}}', '{{dentiste}}', '{{date}}', '{{heure}}', '{{traitement}}', '{{periode}}'];

export function AutomationWhatsAppPage() {
  const qc = useQueryClient();

  // ----- Paramètres d'automatisation -----
  const { data: settings, isLoading: settingsLoading } = useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: automationApi.getSettings,
  });

  const [rappelsActifs, setRappelsActifs] = useState(false);
  const [noShowActif, setNoShowActif] = useState(false);
  const [recallActif, setRecallActif] = useState(false);
  const [offset1, setOffset1] = useState(48);
  const [offset2, setOffset2] = useState(24);
  const [delaiNoShowHeures, setDelaiNoShowHeures] = useState(2);
  const [recallDefautMois, setRecallDefautMois] = useState(6);

  useEffect(() => {
    if (!settings) return;
    setRappelsActifs(settings.rappelsActifs);
    setNoShowActif(settings.noShowActif);
    setRecallActif(settings.recallActif);
    setOffset1(settings.rappelOffsetsHeures?.[0] ?? 48);
    setOffset2(settings.rappelOffsetsHeures?.[1] ?? 24);
    setDelaiNoShowHeures(settings.delaiNoShowHeures);
    setRecallDefautMois(settings.recallDefautMois);
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<Omit<AutomationSettings, 'id' | 'cabinetId'>>) => automationApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-settings'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de l'enregistrement des paramètres");
    },
  });

  function handleSaveSettings() {
    updateSettingsMutation.mutate({
      rappelsActifs,
      noShowActif,
      recallActif,
      rappelOffsetsHeures: [offset1, offset2].filter((v) => Number.isFinite(v)),
      delaiNoShowHeures,
      recallDefautMois,
    });
  }

  // ----- Templates WhatsApp -----
  const [typeFilter, setTypeFilter] = useState<WhatsAppTemplate['type'] | 'all'>('all');

  const { data: templates = [], isLoading: templatesLoading } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp-templates', typeFilter],
    queryFn: () => whatsappApi.listTemplates(typeFilter === 'all' ? undefined : typeFilter),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [formType, setFormType] = useState<WhatsAppTemplate['type']>('reminder');
  const [formNom, setFormNom] = useState('');
  const [formContenu, setFormContenu] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function openCreateModal() {
    setEditingTemplate(null);
    setFormType('reminder');
    setFormNom('');
    setFormContenu('');
    setIsModalOpen(true);
  }

  function openEditModal(template: WhatsAppTemplate) {
    setEditingTemplate(template);
    setFormType(template.type);
    setFormNom(template.nom);
    setFormContenu(template.contenu);
    setIsModalOpen(true);
  }

  const createMutation = useMutation({
    mutationFn: (data: { type: WhatsAppTemplate['type']; nom: string; contenu: string }) => whatsappApi.createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template créé');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la création du template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ nom: string; contenu: string; type: WhatsAppTemplate['type'] }> }) =>
      whatsappApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template mis à jour');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la mise à jour du template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => whatsappApi.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template supprimé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la suppression du template'),
    onSettled: () => setConfirmDeleteId(null),
  });

  function handleSubmitTemplate() {
    if (!formNom || !formContenu) return;
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: { type: formType, nom: formNom, contenu: formContenu } });
    } else {
      createMutation.mutate({ type: formType, nom: formNom, contenu: formContenu });
    }
  }

  function handleDeleteClick(id: number) {
    if (confirmDeleteId === id) {
      deleteMutation.mutate(id);
    } else {
      setConfirmDeleteId(id);
    }
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">WhatsApp</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Paramètres d'automatisation</h2>

          {settingsLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : (
            <div className="space-y-5">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rappelsActifs}
                  onChange={(e) => setRappelsActifs(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Activer les rappels automatiques</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={noShowActif}
                  onChange={(e) => setNoShowActif(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Activer les relances No-Show</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={recallActif}
                  onChange={(e) => setRecallActif(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Activer le Recall</span>
              </label>

              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Premier rappel (heures avant)</label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={offset1}
                      onChange={(e) => setOffset1(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">Deuxième rappel (heures avant)</label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={offset2}
                      onChange={(e) => setOffset2(Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Exemple : 48 et 24 pour un rappel à J-2 et un rappel à J-1.
                </p>
              </div>

              <div>
                <label className="label">Délai avant relance No-Show (heures)</label>
                <input
                  type="number"
                  min={0}
                  className="input max-w-xs"
                  value={delaiNoShowHeures}
                  onChange={(e) => setDelaiNoShowHeures(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="label">Recall par défaut</label>
                <select
                  className="input max-w-xs"
                  value={recallDefautMois}
                  onChange={(e) => setRecallDefautMois(Number(e.target.value))}
                >
                  {RECALL_MONTHS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} mois
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending} className="btn-primary">
                  {updateSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-base font-semibold text-slate-900">Templates WhatsApp</h2>
            <button onClick={openCreateModal} className="btn-primary">
              <Plus size={16} />
              Nouveau template
            </button>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
            Les templates automatiques doivent être approuvés par WhatsApp avant envoi (délai habituel 1-2 jours).
            Le statut ci-dessous reflète cette approbation.
          </p>

          <div className="flex gap-2 mb-4 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  typeFilter === opt.value ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {templatesLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun template pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const badge = APPROVAL_BADGE[template.statutApprobation];
                return (
                  <div key={template.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900">{template.nom}</span>
                          <span className={clsx('badge', badge.className)}>{badge.label}</span>
                          <span className="text-xs text-slate-400">{TYPE_LABELS[template.type]}</span>
                        </div>
                        <div className="text-sm text-slate-500 mt-2 whitespace-pre-wrap max-h-20 overflow-y-auto">
                          {template.contenu}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEditModal(template)} className="btn-ghost !px-2 !py-2" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(template.id)}
                          className={clsx('btn-ghost !px-2 !py-2', confirmDeleteId === template.id && 'text-rose-600')}
                          title={confirmDeleteId === template.id ? 'Cliquer à nouveau pour confirmer' : 'Supprimer'}
                        >
                          {confirmDeleteId === template.id ? (
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
              <h3 className="text-lg font-semibold text-slate-900">
                {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as WhatsAppTemplate['type'])}
                >
                  <option value="reminder">Rappel de rendez-vous</option>
                  <option value="recall">Recall</option>
                  <option value="no_show">No-Show</option>
                </select>
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  type="text"
                  className="input"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Ex : Rappel J-1"
                />
              </div>
              <div>
                <label className="label">Contenu</label>
                <textarea
                  className="input"
                  rows={5}
                  value={formContenu}
                  onChange={(e) => setFormContenu(e.target.value)}
                  placeholder="Bonjour {{prenom}}, ..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  Variables disponibles : {TEMPLATE_VARIABLES.join(' ')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost">
                Annuler
              </button>
              <button
                onClick={handleSubmitTemplate}
                disabled={!formNom || !formContenu || createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Enregistrement...'
                  : editingTemplate
                  ? 'Enregistrer'
                  : 'Créer le template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
