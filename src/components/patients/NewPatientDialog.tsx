import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewPatientDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nom: '', prenom: '', dateNaissance: '', sexe: 'F' as 'M' | 'F',
    gsm: '', ville: '',
  });

  const mutation = useMutation({
    mutationFn: () => patientsApi.create(form),
    onSuccess: (patient) => {
      toast.success('Patient créé');
      qc.invalidateQueries({ queryKey: ['patients'] });
      onClose();
      navigate(`/patients/${patient.id}`);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Nouveau patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" required value={form.prenom}
                     onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" required value={form.nom}
                     onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de naissance</label>
              <input type="date" className="input" value={form.dateNaissance}
                     onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} />
            </div>
            <div>
              <label className="label">Sexe</label>
              <select className="input" value={form.sexe}
                      onChange={(e) => setForm({ ...form, sexe: e.target.value as 'M' | 'F' })}>
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">GSM</label>
            <input className="input" placeholder="22 000 800" value={form.gsm}
                   onChange={(e) => setForm({ ...form, gsm: e.target.value })} />
          </div>

          <div>
            <label className="label">Ville</label>
            <input className="input" placeholder="Sfax" value={form.ville}
                   onChange={(e) => setForm({ ...form, ville: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size={14} className="text-white" /> : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
