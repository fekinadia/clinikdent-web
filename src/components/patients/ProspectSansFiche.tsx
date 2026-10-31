import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi } from '@/api/endpoints';
import type { Patient } from '@/types';

// Un prospect n'a pas de fiche tant qu'il n'est pas venu au cabinet : elle
// apparaît quand il est marqué Arrivé, ou plus tôt avec ce bouton.
export function ProspectSansFiche({ patient }: { patient: Pick<Patient, 'id' | 'prenom' | 'nom' | 'gsm'> }) {
  const queryClient = useQueryClient();

  const creerFiche = useMutation({
    mutationFn: () => patientsApi.update(patient.id, {}),
    onSuccess: () => {
      toast.success('Fiche créée');
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => toast.error('Impossible de créer la fiche'),
  });

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 animate-fade-in">
      <section className="card p-6 max-w-lg mx-auto text-center">
        <h1 className="font-display text-xl font-semibold break-words">
          {patient.prenom} {patient.nom}
        </h1>
        {patient.gsm && (
          <a
            href={`tel:${patient.gsm}`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600"
          >
            <Phone size={14} /> {patient.gsm}
          </a>
        )}
        <p className="text-sm text-slate-600 mt-3">
          Ce prospect n'a pas encore de fiche. Elle sera créée quand il sera marqué Arrivé.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <Link to="/agenda" className="btn-ghost">
            <ArrowLeft size={16} /> Retour à l'agenda
          </Link>
          <button
            type="button"
            className="btn-primary"
            disabled={creerFiche.isPending}
            onClick={() => creerFiche.mutate()}
          >
            <UserPlus size={16} /> Créer la fiche maintenant
          </button>
        </div>
      </section>
    </div>
  );
}
