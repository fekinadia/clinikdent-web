import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import { Spinner } from '@/components/ui/Spinner';

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({
    nomCabinet: '', nom: '', prenom: '', email: '', password: '',
  });

  const mutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      toast.success('Cabinet créé !');
      navigate('/');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md card p-8">
        <h1 className="font-display text-2xl font-semibold">Créer votre cabinet</h1>
        <p className="text-sm text-slate-500 mt-1">Démarrez avec ClinikDent en 1 minute</p>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4 mt-6"
        >
          <div>
            <label className="label">Nom du cabinet</label>
            <input className="input" required value={form.nomCabinet}
                   onChange={(e) => update('nomCabinet', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input className="input" required value={form.prenom}
                     onChange={(e) => update('prenom', e.target.value)} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" required value={form.nom}
                     onChange={(e) => update('nom', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email}
                   onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" required minLength={6}
                   value={form.password} onChange={(e) => update('password', e.target.value)} />
          </div>

          <button type="submit" disabled={mutation.isPending}
                  className="btn-primary w-full py-2.5">
            {mutation.isPending ? <Spinner size={16} className="text-white" /> : 'Créer mon cabinet'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary-500 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
