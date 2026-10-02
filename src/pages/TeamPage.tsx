import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Users, Copy, Check, ShieldCheck, Ban, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi, InvitedTeamMember, TeamMember } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import type { Role } from '@/types';

// Phase 2 "Équipe & rôles" (2026-09-29) — voir la matrice de droits
// validée par Nadia dans claude/roadmap-parite-cabinet-care-2026-09-26.md.
// Réservée au rôle 'admin' du cabinet (contrairement à Comptes démo /
// Tous les comptes, réservés à l'admin PLATEFORME — deux choses
// différentes, voir admin.controller.ts côté API).
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  medecin: 'Médecin',
  assistante: 'Assistante',
  reception: 'Réception',
  comptable: 'Comptable',
};

const INVITABLE_ROLES: Role[] = ['assistante', 'reception', 'comptable', 'medecin', 'admin'];

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-700',
  medecin: 'bg-primary-100 text-primary-700',
  assistante: 'bg-amber-100 text-amber-700',
  reception: 'bg-sky-100 text-sky-700',
  comptable: 'bg-emerald-100 text-emerald-700',
};

export function TeamPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', role: 'assistante' as Role });
  const [invited, setInvited] = useState<InvitedTeamMember | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamApi.list(),
    enabled: user?.role === 'admin',
  });

  const inviteMutation = useMutation({
    mutationFn: () => teamApi.invite(form),
    onSuccess: (data) => {
      setInvited(data);
      setForm({ nom: '', prenom: '', email: '', role: 'assistante' });
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Membre invité');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Impossible d'inviter ce membre");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ role: Role; actif: boolean }> }) =>
      teamApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Membre mis à jour');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Action impossible');
    },
  });

  // Garde côté client (l'API refuse déjà avec un 403 pour un non-admin) —
  // évite juste d'afficher un écran vide/cassé aux autres rôles.
  if (user?.role && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }
    inviteMutation.mutate();
  };

  const handleCopy = () => {
    if (!invited) return;
    const text = `Email : ${invited.email}\nMot de passe temporaire : ${invited.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleActif = (member: TeamMember) => {
    updateMutation.mutate({ id: member.id, data: { actif: !member.actif } });
  };

  const changeRole = (member: TeamMember, role: Role) => {
    if (role === member.role) return;
    updateMutation.mutate({ id: member.id, data: { role } });
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold flex items-center gap-2">
          <Users size={20} className="text-primary-500" />
          Équipe
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inviter et gérer les accès de l'équipe du cabinet (assistante, réception, comptable, médecin)
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Inviter un membre</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input
                  className="input"
                  placeholder="Sonia"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  className="input"
                  placeholder="Ben Salah"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email de connexion</label>
                <input
                  type="email"
                  className="input"
                  placeholder="sonia@cabinet.tn"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="btn-primary disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Invitation...' : 'Inviter'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {invited && (
          <div className="card p-6 border-primary-200 bg-primary-50/40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  Identifiants pour {invited.prenom} {invited.nom}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Copiez-les maintenant et transmettez-les à la personne — le mot de passe ne sera plus jamais affiché.
                  Elle pourra le changer depuis "Changer mon mot de passe".
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
                <div className="font-mono">{invited.email}</div>
              </div>
              <div>
                <div className="label">Mot de passe temporaire</div>
                <div className="font-mono">{invited.tempPassword}</div>
              </div>
              <div>
                <div className="label">Rôle</div>
                <div>{ROLE_LABELS[invited.role]}</div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Membres de l'équipe</h2>
          {isLoading ? (
            <Spinner />
          ) : !members || members.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun membre pour l'instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Nom</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Rôle</th>
                  <th className="pb-2 font-medium">Depuis</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.id === user?.id;
                  return (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">
                        {m.prenom} {m.nom}
                        {isSelf && <span className="text-xs text-slate-400 ml-1.5">(vous)</span>}
                      </td>
                      <td className="py-2.5 text-slate-500">{m.email}</td>
                      <td className="py-2.5">
                        <select
                          className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer ${ROLE_BADGE_CLASS[m.role]}`}
                          value={m.role}
                          disabled={isSelf || updateMutation.isPending}
                          onChange={(e) => changeRole(m, e.target.value as Role)}
                        >
                          {INVITABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 text-slate-500">{formatDate(m.createdAt)}</td>
                      <td className="py-2.5">
                        {m.actif ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <ShieldCheck size={13} /> Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <Ban size={13} /> Désactivé
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => toggleActif(m)}
                            disabled={updateMutation.isPending}
                            className="btn-ghost text-xs px-2.5 py-1 inline-flex items-center gap-1"
                          >
                            {m.actif ? (
                              <>
                                <Ban size={13} /> Désactiver
                              </>
                            ) : (
                              <>
                                <RotateCcw size={13} /> Réactiver
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
