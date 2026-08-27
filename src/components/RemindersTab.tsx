import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Bell, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { remindersApi, Reminder } from '../api/endpoints';
import { formatDate } from '../lib/utils';

interface RemindersTabProps {
  patientId: number;
}

export function RemindersTab({ patientId }: RemindersTabProps) {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders', patientId],
    queryFn: () => remindersApi.listByPatient(patientId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, termine }: { id: number; termine: boolean }) =>
      remindersApi.update(id, { termine }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders', patientId] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => remindersApi.delete(id),
    onSuccess: () => {
      toast.success('Rappel supprimé');
      qc.invalidateQueries({ queryKey: ['reminders', patientId] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const pending = reminders.filter((r) => !r.termine);
  const done = reminders.filter((r) => r.termine);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Rappels</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {pending.length === 0
              ? 'Aucun rappel en attente'
              : `${pending.length} rappel${pending.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
        >
          <Plus className="w-4 h-4" />
          Ajouter un rappel
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3">Chargement...</p>
        </div>
      )}

      {!isLoading && reminders.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Aucun rappel pour ce patient</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Créer le premier rappel
          </button>
        </div>
      )}

      {!isLoading && reminders.length > 0 && (
        <div className="space-y-2">
          {[...pending, ...done].map((rem) => (
            <div
              key={rem.id}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                rem.termine ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'
              }`}
            >
              <button
                onClick={() => toggleMutation.mutate({ id: rem.id, termine: !rem.termine })}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                  rem.termine
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 hover:border-primary-400'
                }`}
                title={rem.termine ? 'Marquer comme non fait' : 'Marquer comme fait'}
              >
                {rem.termine && <Check size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${
                    rem.termine ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}
                >
                  {formatDate(rem.dateRappel)}
                </div>
                {rem.note && (
                  <div className={`text-sm mt-0.5 ${rem.termine ? 'text-slate-400' : 'text-slate-600'}`}>
                    {rem.note}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (confirm('Supprimer ce rappel ?')) {
                    deleteMutation.mutate(rem.id);
                  }
                }}
                className="text-slate-400 hover:text-rose-600 transition flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <AddReminderDialog patientId={patientId} onClose={() => setIsDialogOpen(false)} />
      )}
    </div>
  );
}

function AddReminderDialog({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [dateRappel, setDateRappel] = useState('');
  const [note, setNote] = useState('');

  const createMutation = useMutation({
    mutationFn: () => remindersApi.create({ patientId, dateRappel, note: note || undefined }),
    onSuccess: () => {
      toast.success('Rappel créé');
      qc.invalidateQueries({ queryKey: ['reminders', patientId] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du rappel');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Ajouter un rappel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Date du rappel</label>
            <input
              type="date"
              value={dateRappel}
              onChange={(e) => setDateRappel(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              rows={3}
              placeholder="Ex : Rappeler pour confirmer le rendez-vous"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!dateRappel || createMutation.isPending}
            className="px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            {createMutation.isPending ? 'Création...' : 'Créer le rappel'}
          </button>
        </div>
      </div>
    </div>
  );
}
