import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const STATUT_LABELS: Record<string, { label: string; badge: string }> = {
  actif: { label: 'Démo actif', badge: 'badge-success' },
  expire: { label: 'Démo expiré', badge: 'badge-danger' },
  essai: { label: 'En essai', badge: 'badge-info' },
  essai_termine: { label: 'Essai terminé', badge: 'badge-danger' },
  abonne: { label: 'Abonné', badge: 'badge-success' },
};

export function AllAccountsPage() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['admin-all-accounts'],
    queryFn: adminApi.listAllAccounts,
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Tous les comptes</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Liste de tous les cabinets inscrits sur la plateforme (démo et clients permanents)
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="card p-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Aucun compte pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-2 pr-4">Cabinet</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Créé le</th>
                    <th className="py-2 pr-4">Expire / Fin d'essai</th>
                    <th className="py-2 pr-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const statutInfo = STATUT_LABELS[a.statut] ?? { label: a.statut, badge: 'badge-info' };
                    const expiryValue = a.type === 'demo' ? a.demoExpiresAt : a.trialEndsAt;
                    return (
                      <tr key={a.cabinetId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4">{a.nomCabinet}</td>
                        <td className="py-2 pr-4">{a.email ?? '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`badge ${a.type === 'demo' ? 'badge-warning' : 'badge-info'}`}>
                            {a.type === 'demo' ? 'Démo' : 'Permanent'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 capitalize">{a.plan}</td>
                        <td className="py-2 pr-4">{formatDate(a.createdAt)}</td>
                        <td className="py-2 pr-4">{formatDate(expiryValue)}</td>
                        <td className="py-2 pr-4">
                          <span className={`badge ${statutInfo.badge}`}>{statutInfo.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
