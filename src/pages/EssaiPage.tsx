import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Check, CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { essaiApi, type EssaiCree } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import { lienWhatsApp, NUMERO_CONTACT } from '@/lib/whatsappRappel';

// Essai en un clic (2026-11-02), page publique : le médecin s'inscrit seul et
// entre dans un cabinet rempli de patients fictifs, sans démo ni compte à créer.

const DELAI_REVEIL_MS = 4000;
const LIEN_AIDE = lienWhatsApp(NUMERO_CONTACT, 'Bonjour, je voudrais retrouver mon essai ClinikDent.');

function messageErreur(statut?: number): string {
  switch (statut) {
    case 409:
      return 'Un essai est déjà en cours pour ce numéro. Écrivez-nous sur WhatsApp pour le retrouver.';
    case 429:
      return 'Trop de demandes pour le moment. Écrivez-nous sur WhatsApp et nous ouvrons votre essai.';
    case 400:
      return 'Vérifiez votre numéro de téléphone.';
    default:
      return 'Connexion impossible. Vérifiez votre réseau, puis réessayez.';
  }
}

function dateFin(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Tunis',
  });
}

function CabinetPret({ essai }: { essai: EssaiCree }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useAuthStore((s) => s.login);
  const [copie, setCopie] = useState<'ok' | 'impossible' | null>(null);

  // Le navigateur intégré de Facebook peut refuser le presse-papiers.
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(`${essai.email}\n${essai.motDePasse}`);
      setCopie('ok');
    } catch {
      setCopie('impossible');
    }
  };

  const ouvrir = () => {
    queryClient.clear();
    login(essai.accessToken, essai.user);
    navigate('/');
  };

  return (
    <>
      <CheckCircle2 size={36} className="text-accent-500" aria-hidden="true" />
      <h1 className="font-display text-2xl font-semibold text-primary-900 mt-3">
        Votre cabinet d’essai est prêt
      </h1>
      <p className="text-slate-600 mt-2">
        Il reste ouvert jusqu’au {dateFin(essai.expireLe)}. Gardez ces identifiants pour y revenir
        depuis un autre appareil.
      </p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-3">
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-slate-500">Identifiant</dt>
            <dd className="font-mono break-all">{essai.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Mot de passe</dt>
            <dd className="font-mono break-all">{essai.motDePasse}</dd>
          </div>
        </dl>
        {copie === 'impossible' ? (
          <p className="text-slate-600">Copie impossible ici : notez-les ou faites une capture d’écran.</p>
        ) : (
          <button
            type="button"
            onClick={copier}
            className="inline-flex items-center gap-1.5 text-primary-500 font-medium"
          >
            {copie ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copie ? 'Copié' : 'Copier les identifiants'}
          </button>
        )}
      </div>

      <button type="button" onClick={ouvrir} className="btn-primary w-full !py-3 mt-5">
        Ouvrir mon cabinet d’essai
      </button>
    </>
  );
}

export function EssaiPage() {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [nomCabinet, setNomCabinet] = useState('');
  const [gsm, setGsm] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [reveil, setReveil] = useState(false);

  useEffect(() => {
    document.title = 'Essayer ClinikDent — 7 jours gratuits';
  }, []);

  const creation = useMutation<EssaiCree, AxiosError>({
    mutationFn: () =>
      essaiApi.creer({ prenom, nom, nomCabinet, gsm, siteWeb: siteWeb || undefined }),
  });

  // Le serveur gratuit dort quand personne ne l'utilise : jusqu'à une minute au réveil.
  useEffect(() => {
    if (!creation.isPending) {
      setReveil(false);
      return;
    }
    const minuteur = setTimeout(() => setReveil(true), DELAI_REVEIL_MS);
    return () => clearTimeout(minuteur);
  }, [creation.isPending]);

  const statutErreur = creation.error?.response?.status;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-primary-950 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-4">
          <span className="font-display text-xl font-semibold">ClinikDent</span>
          <Link to="/decouvrir" className="text-sm text-white/70 hover:text-white">
            Découvrir
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        {creation.data ? (
          <CabinetPret essai={creation.data} />
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold text-primary-900">
              Essayez ClinikDent dans votre propre cabinet
            </h1>
            <p className="text-slate-600 mt-2">
              Votre agenda, vos fiches et votre caisse sont déjà remplis avec des patients
              fictifs. Gratuit pendant 7 jours.
            </p>

            <form
              className="relative mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!creation.isPending) creation.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="essai-prenom" className="label">Prénom</label>
                  <input
                    id="essai-prenom"
                    className="input !text-base"
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="essai-nom" className="label">Nom</label>
                  <input
                    id="essai-nom"
                    className="input !text-base"
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="essai-cabinet" className="label">Nom du cabinet</label>
                <input
                  id="essai-cabinet"
                  className="input !text-base"
                  required
                  maxLength={200}
                  autoComplete="organization"
                  placeholder="Cabinet dentaire du Dr ..."
                  value={nomCabinet}
                  onChange={(e) => setNomCabinet(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="essai-gsm" className="label">Votre numéro WhatsApp</label>
                <input
                  id="essai-gsm"
                  type="tel"
                  dir="ltr"
                  className="input !text-base"
                  required
                  maxLength={25}
                  autoComplete="tel"
                  placeholder="22 000 000"
                  value={gsm}
                  onChange={(e) => setGsm(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Les rappels que vous essayez arriveront sur ce numéro.
                </p>
              </div>

              {/* Invisible pour un humain : seul un robot le remplit. */}
              <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                <label>
                  Site web
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={siteWeb}
                    onChange={(e) => setSiteWeb(e.target.value)}
                  />
                </label>
              </div>

              {creation.isError && (
                <div role="alert" className="text-sm text-rose-700">
                  <p>{messageErreur(statutErreur)}</p>
                  {(statutErreur === 409 || statutErreur === 429) && (
                    <a
                      href={LIEN_AIDE}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-emerald-700"
                    >
                      <MessageCircle size={16} aria-hidden="true" /> Écrire sur WhatsApp
                    </a>
                  )}
                </div>
              )}

              <button type="submit" className="btn-primary w-full !py-3" disabled={creation.isPending}>
                {creation.isPending ? 'Préparation de votre cabinet…' : 'Ouvrir mon cabinet d’essai'}
              </button>
              {reveil && (
                <p className="text-sm text-slate-600">
                  Cela peut prendre jusqu’à une minute. Gardez cette page ouverte.
                </p>
              )}
              <p className="text-xs text-slate-500">
                Votre nom et votre numéro servent uniquement à cet essai et à vous recontacter.
                Les patients affichés sont inventés : n’ajoutez pas de vrais patients.
              </p>
            </form>

            <p className="text-sm text-slate-500 mt-6">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary-500 font-medium">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
