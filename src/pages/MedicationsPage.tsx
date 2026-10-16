import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Search, Pencil, Trash2, X, Copy, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { medicationsApi } from '@/api/endpoints';
import { Medication } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

// Page "Médicaments" (2026-10-02) — catalogue façon Dentalis (capture envoyée
// par Nadia) : recherche, tableau Médicament/Posologie/Forme/Prescrit,
// pagination, création/édition/retrait. Depuis le 2026-10-16 : le catalogue
// commun est en lecture seule (cadenas) et chaque cabinet modifie/retire
// uniquement ses propres médicaments. Le bouton « Copier » crée une version
// modifiable d'un médicament du catalogue commun.

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
];

function badgeColor(nom: string) {
  const code = nom.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return BADGE_COLORS[code % BADGE_COLORS.length];
}

function initialsOf(nom: string) {
  const words = nom.trim().split(/\s+/);
  return (words[0]?.[0] || '') + (words[1]?.[0] || '');
}

export function MedicationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // 'new' = formulaire vide ; { copie } = formulaire prérempli depuis un
  // médicament du catalogue commun ; un médicament = modification.
  const [dialogMedication, setDialogMedication] = useState<
    Medication | 'new' | { copie: Medication } | null
  >(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['medications-catalog', search, page],
    queryFn: () => medicationsApi.list({ search, page, limit: 20 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => medicationsApi.remove(id),
    onSuccess: () => {
      toast.success('Médicament retiré');
      qc.invalidateQueries({ queryKey: ['medications-catalog'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors du retrait'),
  });

  const items = data?.items ?? [];
  // Ce que le formulaire doit afficher : modification d'un médicament du
  // cabinet, copie d'un médicament commun, ou création vide.
  const copie =
    dialogMedication && typeof dialogMedication === 'object' && 'copie' in dialogMedication
      ? dialogMedication.copie
      : null;
  const aModifier =
    dialogMedication && typeof dialogMedication === 'object' && !('copie' in dialogMedication)
      ? dialogMedication
      : null;

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <Pill size={20} className="text-primary-500" />
            Médicaments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalogue commun (lecture seule) et vos propres médicaments, utilisés pour composer les ordonnances
          </p>
        </div>
        <button
          onClick={() => setDialogMedication('new')}
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
        >
          <Plus className="w-4 h-4" />
          Nouveau médicament
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="card">
          <div className="p-4 border-b border-slate-200">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher un médicament..."
                className="input pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">Aucun médicament trouvé</p>
              <button
                onClick={() => setDialogMedication('new')}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ajouter un médicament
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200">
                      <th className="px-4 py-3">Médicament</th>
                      <th className="px-4 py-3">Posologie</th>
                      <th className="px-4 py-3">Forme</th>
                      <th className="px-4 py-3">Prescrit</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${badgeColor(m.nom)}`}
                            >
                              {initialsOf(m.nom)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{m.nom}</div>
                              {m.dosage && (
                                <div className="text-xs text-slate-500">{m.dosage}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.posologieDefaut || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.forme || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {m.nbPrescriptions ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {m.modifiable ? (
                              <>
                                <button
                                  onClick={() => setDialogMedication(m)}
                                  className="text-slate-400 hover:text-primary-600 transition"
                                  title="Modifier"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Retirer « ${m.nom} » de vos médicaments ?`)) {
                                      removeMutation.mutate(m.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition"
                                  title="Retirer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span
                                  className="inline-flex items-center gap-1 text-xs text-slate-400"
                                  title="Catalogue commun : ce médicament ne peut pas être modifié"
                                >
                                  <Lock size={13} />
                                  Commun
                                </span>
                                <button
                                  onClick={() => setDialogMedication({ copie: m })}
                                  className="text-slate-400 hover:text-primary-600 transition"
                                  title="Créer ma version modifiable"
                                >
                                  <Copy size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data && data.pageCount > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-200 text-sm">
                  <span className="text-slate-500">
                    Page {page} sur {data.pageCount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="btn-ghost"
                    >
                      ← Précédent
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.pageCount}
                      className="btn-ghost"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {dialogMedication && (
        <MedicationDialog
          medication={aModifier}
          prefill={copie}
          onClose={() => setDialogMedication(null)}
        />
      )}
    </>
  );
}

function MedicationDialog({
  medication,
  prefill,
  onClose,
}: {
  medication: Medication | null;
  prefill?: Medication | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const source = medication ?? prefill ?? null;
  const [nom, setNom] = useState(source?.nom || '');
  const [dosage, setDosage] = useState(source?.dosage || '');
  const [forme, setForme] = useState(source?.forme || '');
  const [posologieDefaut, setPosologieDefaut] = useState(source?.posologieDefaut || '');

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = { nom, dosage: dosage || undefined, forme: forme || undefined, posologieDefaut: posologieDefaut || undefined };
      return medication
        ? medicationsApi.update(medication.id, data)
        : medicationsApi.create(data);
    },
    onSuccess: () => {
      toast.success(medication ? 'Médicament modifié' : 'Médicament ajouté');
      qc.invalidateQueries({ queryKey: ['medications-catalog'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de l'enregistrement");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {medication ? 'Modifier le médicament' : prefill ? 'Ma version du médicament' : 'Nouveau médicament'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        {!medication && (
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            {prefill
              ? "Une copie modifiable est ajoutée à vos médicaments ; le catalogue commun reste inchangé."
              : 'Ce médicament sera ajouté à votre cabinet.'}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="label">Nom</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input"
              placeholder="Ex : Doliprane 1G B/8"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosage</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="input"
                placeholder="Ex : 1000 CP"
              />
            </div>
            <div>
              <label className="label">Forme</label>
              <input
                type="text"
                value={forme}
                onChange={(e) => setForme(e.target.value)}
                className="input"
                placeholder="Ex : Comprimés"
              />
            </div>
          </div>
          <div>
            <label className="label">Posologie par défaut</label>
            <input
              type="text"
              value={posologieDefaut}
              onChange={(e) => setPosologieDefaut(e.target.value)}
              className="input"
              placeholder="Ex : 1000 CP / 3*1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!nom.trim() || saveMutation.isPending}
            className="px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
