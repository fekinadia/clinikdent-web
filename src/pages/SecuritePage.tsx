import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock,
  History,
  Lock,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { lienWhatsApp, NUMERO_CONTACT } from '@/lib/whatsappRappel';

// Page publique « Sécurité et données » (2026-11-06) : chaque phrase doit rester
// vraie. Vérifier le code avant d'y ajouter une promesse.

const LIEN_QUESTION = lienWhatsApp(NUMERO_CONTACT, 'Bonjour, j’ai une question sur la sécurité de ClinikDent.');

const PROTECTIONS: { icone: LucideIcon; titre: string; texte: string }[] = [
  {
    icone: Lock,
    titre: 'Mots de passe chiffrés',
    texte: 'Votre mot de passe est chiffré avant d’être enregistré. Personne ne peut le lire, pas même moi.',
  },
  {
    icone: ShieldCheck,
    titre: 'Connexion chiffrée',
    texte: 'Tout ce qui passe entre votre écran et ClinikDent circule par une connexion chiffrée (HTTPS).',
  },
  {
    icone: Building2,
    titre: 'Chaque cabinet à part',
    texte: 'Un cabinet ne voit jamais les patients, l’agenda ni la caisse d’un autre cabinet.',
  },
  {
    icone: Users,
    titre: 'Un accès par rôle',
    texte: 'Médecin, assistante, réception, comptable : chacun voit ce dont il a besoin. La réception ne voit pas la facturation.',
  },
  {
    icone: ShieldAlert,
    titre: 'Tentatives freinées',
    texte: 'Les essais de mot de passe répétés sont bloqués un moment, pour décourager ceux qui devinent.',
  },
  {
    icone: History,
    titre: 'Un journal des actions',
    texte: 'Les suppressions et les corrections importantes sont notées : qui, quoi et quand.',
  },
  {
    icone: Clock,
    titre: 'Une session limitée',
    texte: 'La connexion expire après 7 jours. Vous changez votre mot de passe quand vous voulez.',
  },
];

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold text-primary-900 sm:text-3xl">{titre}</h2>
      <div className="mt-4 space-y-3 text-lg leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export function SecuritePage() {
  useEffect(() => {
    document.title = 'Sécurité et données — ClinikDent';
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="bg-primary-950 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/decouvrir" className="font-display text-xl font-semibold">
            ClinikDent
          </Link>
          <Link to="/login" className="text-sm text-white/70 hover:text-white">
            Déjà client ? Se connecter
          </Link>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Vos données, protégées et à vous
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
            Un dossier patient est une donnée de santé. Voici, simplement, comment ClinikDent la protège.
          </p>
          <p className="mt-4 text-sm text-white/50">Mis à jour le 6 novembre 2026</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-primary-900 sm:text-3xl">
            Ce qui protège votre cabinet
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {PROTECTIONS.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="flex gap-4 rounded-xl border border-slate-200 p-5">
                <Icone size={24} className="mt-0.5 flex-none text-accent-600" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-primary-900">{titre}</h3>
                  <p className="mt-1 leading-relaxed text-slate-600">{texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Section titre="Où sont vos données">
          <p>
            Elles sont stockées en Allemagne, dans l’Union européenne, chez des hébergeurs reconnus : Supabase pour
            la base de données, Render pour le serveur et Vercel pour l’affichage du site.
          </p>
          <p>
            Une copie de sauvegarde est faite chaque semaine, et sa restauration a été testée. Les photos et fichiers
            joints ne sont pas encore inclus dans cette sauvegarde.
          </p>
        </Section>

        <Section titre="Elles vous appartiennent">
          <p>Je ne partage ni ne vends vos données, à personne.</p>
          <p>
            Vous pouvez demander une copie de vos données à tout moment. Si vous arrêtez ClinikDent, elles sont
            supprimées dans les 30 jours, comme prévu dans notre accord.
          </p>
          <p>
            Pour la maintenance, je peux techniquement accéder à la base de données. Je ne consulte pas vos dossiers
            sans votre demande.
          </p>
        </Section>

        <Section titre="Pendant l’essai de 7 jours">
          <p>
            Le cabinet d’essai ne contient que des patients fictifs : n’y ajoutez pas de vrais patients. Votre nom et
            votre numéro servent uniquement à l’essai et à vous recontacter.
          </p>
          <p>
            Pendant l’essai, l’ajout de photos et de fichiers est désactivé, et aucun message automatique n’est
            envoyé. Les cabinets d’essai terminés restent enregistrés : écrivez-moi pour faire supprimer le vôtre.
          </p>
        </Section>

        <Section titre="Vos bons réflexes">
          <ul className="list-disc space-y-2 pl-6">
            <li>Un compte par personne de l’équipe, jamais de mot de passe partagé.</li>
            <li>Un mot de passe que vous n’utilisez nulle part ailleurs.</li>
            <li>Déconnectez-vous sur un ordinateur partagé.</li>
          </ul>
        </Section>

        <Section titre="En toute honnêteté">
          <p>
            Aucun système n’est infaillible. Si vous remarquez un problème ou si vous avez une question, écrivez-moi.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <a
              href={LIEN_QUESTION}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={20} aria-hidden="true" /> Poser une question sur WhatsApp
            </a>
            <Link
              to="/essai"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-semibold text-primary-900 transition-colors hover:bg-slate-50"
            >
              Essayer ClinikDent <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </Section>
      </main>
    </div>
  );
}
