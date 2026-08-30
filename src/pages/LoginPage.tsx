import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import { Spinner } from '@/components/ui/Spinner';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      toast.success('Bienvenue !');
      navigate('/');
    },
    onError: () => {
      toast.error('Email ou mot de passe incorrect');
    },
  });

  return (
    <div className="min-h-screen flex">
      {/* Visuel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-700 via-primary-500 to-accent-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative text-white max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5.5c-1.074-.586-2.583-1.5-4.5-1.5C5.5 4 4 5.5 4 8c0 1.5.5 3 1 4.5C5.5 14 6 16 6.5 18c.5 2 1 3 2 3 1.5 0 1.5-3 3.5-3s2 3 3.5 3c1 0 1.5-1 2-3 .5-2 1-4 1.5-5.5.5-1.5 1-3 1-4.5 0-2.5-1.5-4-3.5-4-1.917 0-3.426.914-4.5 1.5z"/>
            </svg>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            ClinikDent
          </h1>
          <p className="text-white/80 mt-3 text-lg">
            La gestion moderne de votre cabinet dentaire.
          </p>
          <div className="mt-12 space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span className="text-white/90">Patients, agenda et soins en un seul endroit</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span className="text-white/90">Schéma dentaire interactif</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span className="text-white/90">Disponible web, desktop et mobile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold">Connexion</h2>
          <p className="text-sm text-slate-500 mt-1">Accédez à votre espace</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4 mt-8"
          >
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-2.5"
            >
              {mutation.isPending ? <Spinner size={16} className="text-white" /> : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-500 font-medium hover:underline">
              Créer un cabinet
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
