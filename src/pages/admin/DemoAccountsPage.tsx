import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { UserPlus, Copy, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, CreatedDemoAccount } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

type AccountType = 'demo' | 'permanent';

export function DemoAccountsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nomCabinet: '',
    prenom: '',
    nom: '',
    email: '',
    type: 'demo' as AccountType,
  });
  const [created, setCreated] = useState<CreatedDemoAccount | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => adminApi.listDemoAccounts(),
    enabled: !!user?.isPlatformAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createDemoAccount(form),
    onSuccess: (data) => {
      setCreated(data);
      setForm({ nomCabinet: '', prenom: '', nom: '', email: '', type: 'demo' });
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['demo-accounts'] });
      toast.success(data.type === 'permanent' ? 'Compte client créé' : 'Compte démo créé');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Impossible de créer le compte');
    },
  });

  // Garde côté client (l'API refuse déjà la requête avec un 403 pour un
  // non-admin ; ceci évite juste d'afficher un écran vide/cassé).
  if (!user?.isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomCabinet.trim() || !form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    createMutation.mutate();
  };

  const handleCopy = () => {
    if (!created) return;
    const validite =
      created.type === 'permanent'
        ? `Essai gratuit jusqu'au ${formatDate(created.trialEndsAt)} (14 jours)`
        : `Valable jusqu'au ${formatDate(created.demoExpiresAt)} (24h)`;
    const text = `Email : ${created.email}\nMot de passe : ${created.password}\n${validite}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold flex items-center gap-2">
          <UserPlus size={20} className="text-primary-500" />
          Nouveaux comptes
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Créer un accès de test (24h) ou un vrai compte client (essai 14 jours)
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Nouveau compte</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Type de compte</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={form.type === 'demo'}
                    onChange={() => setForm({ ...form, type: 'demo' })}
                  />
                  Démo (24h, pour un essai avant de s'engager)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={form.type === 'permanent'}
                    onChange={() => setForm({ ...form, type: 'permanent' })}
                  />
                  Client permanent (essai de 14 jours, compte normal)
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nom du cabinet</label>
                <input
                  className="input"
                  placeholder="Cabinet Dentaire Sfax"
                  value={form.nomCabinet}
                  onChange={(e) => setForm({ ...form, nomCabinet: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email de connexion</label>
                <input
                  type="email"
                  className="input"
                  placeholder="prospect@exemple.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Prénom (du praticien)</label>
                <input
                  className="input"
                  placeholder="Mohamed"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Nom (du praticien)</label>
                <input
                  className="input"
                  placeholder="Ben Salah"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary disabled:opacity-50"
                >
                  {createMutation.isPending
                    ? 'Création...'
                    : form.type === 'permanent'
                      ? 'Créer le compte client'
                      : 'Créer le compte démo (24h)'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {created && (
          <div className="card p-6 border-primary-200 bg-primary-50/40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  Identifiants pour {created.nomCabinet}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Copiez-les maintenant — le mot de passe ne sera plus jamais affiché.
                </div>
              </div>
              <button onClick={handleCopy} className="btn-ghost flex items-center gap-1.5 text-sm">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="label">Email</div>
                <div className="font-mono">{created.email}</div>
              </div>
              <div>
                <div className="label">Mot de passe</div>
                <div className="font-mono">{created.password}</div>
              </div>
              <div>
                <div className="label">
                  {created.type === 'permanent' ? "Fin de l'essai gratuit" : 'Expire le'}
                </div>
                <div>
                  {created.type === 'permanent'
                    ? formatDate(created.trialEndsAt)
                    : formatDate(created.demoExpiresAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Comptes démo existants</h2>
          {isLoading ? (
            <Spinner />
          ) : !accounts || accounts.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun compte démo créé pour l'instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Cabinet</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Créé le</th>
                  <th className="pb-2 font-medium">Expire le</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.cabinetId} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">{acc.nomCabinet}</td>
                    <td className="py-2.5 font-mono text-xs">{acc.email ?? '—'}</td>
                    <td className="py-2.5 text-slate-500">{formatDate(acc.createdAt)}</td>
                    <td className="py-2.5 text-slate-500">
                      {acc.demoExpiresAt ? formatDate(acc.demoExpiresAt) : '—'}
                    </td>
                    <td className="py-2.5">
                      <span className={`badge ${acc.expired ? 'badge-danger' : 'badge-success'}`}>
                        {acc.expired ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> Expiré
                          </span>
                        ) : (
                          'Actif'
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Seuls les comptes démo (24h) apparaissent dans cette liste.
          </p>
        </div>
      </div>
    </>
  );
}
