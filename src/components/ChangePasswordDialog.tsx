import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Volet "changer mon mot de passe" (2026-09-21) — self-service pour un
// utilisateur déjà connecté. Ouvert depuis la carte profil en bas de la
// sidebar (AppLayout). Un vrai "mot de passe oublié" (par email, pour un
// utilisateur qui n'arrive plus à se connecter du tout) reste à construire
// séparément — celui-ci suppose qu'on est déjà connecté.
export function ChangePasswordDialog({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      handleClose();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Erreur lors du changement de mot de passe'),
  });

  if (!open) return null;

  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Changer le mot de passe</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="label">Mot de passe actuel</label>
            <input
              type="password"
              className="input"
              autoFocus
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {tooShort && <p className="text-xs text-red-600 mt-1">6 caractères minimum</p>}
          </div>

          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {mismatch && (
              <p className="text-xs text-red-600 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className="btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending || !canSubmit} className="btn-primary">
              {mutation.isPending ? <Spinner size={14} className="text-white" /> : 'Changer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
