import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { patientsApi } from '@/api/endpoints';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { calculateAge } from '@/lib/utils';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';

export function PatientsListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => patientsApi.list({ search, page, limit: 20 }),
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Patients</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data?.total ?? 0} patient{(data?.total ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <button onClick={() => setOpenDialog(true)} className="btn-primary">
          <Plus size={16} /> Nouveau patient
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="card overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher par nom, GSM, dossier..."
                className="input pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16"><Spinner /></div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title="Aucun patient trouvé"
              description={search ? 'Essayez avec d\'autres mots-clés' : 'Commencez par créer votre premier patient'}
              action={
                !search && (
                  <button onClick={() => setOpenDialog(true)} className="btn-primary">
                    <Plus size={16} /> Créer un patient
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold">Dossier</th>
                      <th className="text-left py-3 px-4 font-semibold">Âge</th>
                      <th className="text-left py-3 px-4 font-semibold">Téléphone</th>
                      <th className="text-left py-3 px-4 font-semibold">Ville</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <Link to={`/patients/${p.id}`} className="flex items-center gap-3">
                            <Avatar prenom={p.prenom} nom={p.nom} sexe={p.sexe} size="sm" />
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                {p.prenom} {p.nom}
                                {p.estProspect && (
                                  <span className="badge badge-warning">Prospect</span>
                                )}
                              </div>
                              {p.email && (
                                <div className="text-xs text-slate-500">{p.email}</div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-slate-600 whitespace-nowrap">
                          N° {p.numeroDossier}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                          {calculateAge(p.dateNaissance) ?? '—'} {p.dateNaissance && 'ans'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{p.gsm || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{p.ville || '—'}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            to={`/patients/${p.id}`}
                            className="text-xs text-primary-500 hover:underline"
                          >
                            Ouvrir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pageCount > 1 && (
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

      <NewPatientDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </>
  );
}
