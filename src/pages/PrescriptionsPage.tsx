import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { prescriptionsApi, PrescriptionModele } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';

export function PrescriptionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const qc = useQueryClient();

  const { data: modeles = [], isLoading } = useQuery<PrescriptionModele[]>({
    queryKey: ['prescription-modeles'],
    queryFn: () => prescriptionsApi.listModeles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => prescriptionsApi.deleteModele(id),
    onSuccess: () => {
      toast.success('Modèle supprimé');
      qc.invalidateQueries({ queryKey: ['prescription-modeles'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <FileText size={20} className="text-primary-500" />
            Ordonnances
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modèles réutilisables — une ordonnance se crée depuis la fiche du patient (onglet
            « Ordonnances »)
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
        >
          <Plus className="w-4 h-4" />
          Nouveau modèle
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        {isLoading ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : modeles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">Aucun modèle d'ordonnance pour l'instant</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Créer un premier modèle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modeles.map((m) => (
              <div key={m.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{m.nom}</h3>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce modèle ?')) deleteMutation.mutate(m.id);
                    }}
                    className="text-slate-400 hover:text-rose-600 transition flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">
                  {m.contenu}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDialogOpen && <AddModeleDialog onClose={() => setIsDialogOpen(false)} />}
    </>
  );
}

function AddModeleDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [contenu, setContenu] = useState('');

  const createMutation = useMutation({
    mutationFn: () => prescriptionsApi.createModele({ nom, contenu }),
    onSuccess: () => {
      toast.success('Modèle créé');
      qc.invalidateQueries({ queryKey: ['prescription-modeles'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du modèle');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Nouveau modèle d'ordonnance</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Nom du modèle</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input"
              placeholder="Ex : Détartrage standard"
            />
          </div>
          <div>
            <label className="label">Contenu</label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              className="input"
              rows={8}
              placeholder="Texte de l'ordonnance à réutiliser..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!nom.trim() || !contenu.trim() || createMutation.isPending}
            className="px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            {createMutation.isPending ? 'Création...' : 'Créer le modèle'}
          </button>
        </div>
      </div>
    </div>
  );
}
