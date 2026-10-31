import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { lienWhatsApp } from '@/lib/whatsappRappel';

// Page de présentation de ClinikDent (2026-11-01), publique : c'est l'étape
// entre les posts et la démo. Les captures de public/presentation viennent d'un
// cabinet fictif, jamais de vraies données.

const NUMERO_CONTACT = '29270124';
const MESSAGE_CONTACT = 'Bonjour, je suis dentiste et je voudrais essayer ClinikDent gratuitement.';
const LIEN_CONTACT = lienWhatsApp(NUMERO_CONTACT, MESSAGE_CONTACT);

const IMAGES = '/presentation';

const PROBLEMES = [
  {
    titre: 'Le dossier perdu dans le cahier',
    texte: 'Tapez un nom ou une date de naissance : la fiche du patient s’ouvre.',
  },
  {
    titre: '« Il me doit combien, déjà ? »',
    texte: 'Le reste à payer se calcule tout seul, patient par patient.',
  },
  {
    titre: 'Le patient qui oublie son rendez-vous',
    texte: 'La veille, le rappel WhatsApp est prêt : il ne reste qu’à l’envoyer.',
  },
];

const ETAPES = [
  { titre: 'Une démo de 10 minutes', texte: 'Je vous montre ClinikDent dans votre cabinet.' },
  { titre: 'L’installation avec vous', texte: 'Compte, tarifs et premiers patients : on le fait ensemble.' },
  { titre: 'Un mois pour essayer', texte: 'Gratuit et sans engagement. Vous gardez vos fiches pendant le test.' },
];

const QUESTIONS = [
  {
    question: 'Combien ça coûte ?',
    reponse:
      'Le test d’un mois est gratuit et sans engagement. On parle du prix à la fin, et vous restez libre de dire non.',
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    reponse:
      'Elles vous appartiennent et je ne les partage avec personne. Elles sont stockées en Allemagne et sauvegardées chaque semaine. Les photos et fichiers joints ne sont pas encore inclus dans cette sauvegarde.',
  },
  {
    question: 'Faut-il installer quelque chose ?',
    reponse: 'Non. ClinikDent s’ouvre dans le navigateur, sur ordinateur, tablette ou téléphone.',
  },
  {
    question: 'Et si Internet coupe ?',
    reponse:
      'ClinikDent a besoin d’Internet, mais la 4G d’un téléphone suffit. Pendant le test, gardez vos fiches pour l’essentiel.',
  },
  {
    question: 'C’est en arabe ?',
    reponse:
      'Les rappels et la page de réservation existent en arabe. L’écran du cabinet est en français pour l’instant.',
  },
  {
    question: 'Ça gère la CNAM ?',
    reponse:
      'Vous pouvez noter un paiement CNAM dans la caisse. ClinikDent ne remplit pas et n’envoie pas les dossiers à la CNAM.',
  },
];

function BoutonWhatsApp({ className = '' }: { className?: string }) {
  return (
    <a
      href={LIEN_CONTACT}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 ${className}`}
    >
      <MessageCircle size={20} aria-hidden="true" /> Essayer gratuitement sur WhatsApp
    </a>
  );
}

function Telephone({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[280px] rounded-[28px] bg-primary-950 p-2 shadow-xl">
      <img
        src={`${IMAGES}/${image}`}
        alt={alt}
        width={840}
        height={1560}
        loading="lazy"
        className="w-full rounded-[22px]"
      />
    </div>
  );
}

function Atout({
  titre,
  texte,
  inverse,
  children,
}: {
  titre: string;
  texte: string;
  inverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={inverse ? 'md:order-2' : undefined}>
        <h3 className="font-display text-2xl font-semibold text-primary-900 sm:text-3xl">{titre}</h3>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">{texte}</p>
      </div>
      <div className={inverse ? 'md:order-1' : undefined}>{children}</div>
    </section>
  );
}

export function DecouvrirPage() {
  useEffect(() => {
    document.title = 'ClinikDent — Tout votre cabinet dentaire sur un seul écran';
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20 text-slate-900 sm:pb-0">
      <header className="bg-primary-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="font-display text-xl font-semibold">ClinikDent</span>
          <Link to="/login" className="text-sm text-white/70 hover:text-white">
            Déjà client ? Se connecter
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Tout votre cabinet dentaire, sur un seul écran
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            Dossiers patients, agenda, caisse et chèques, rappels WhatsApp et réservation en ligne.
            Pensé pour les cabinets tunisiens, en dinars.
          </p>
          <div className="mt-7">
            <BoutonWhatsApp className="w-full sm:w-auto" />
            <p className="mt-3 text-sm text-white/70">1 mois gratuit · sans engagement · installation avec vous</p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <img
            src={`${IMAGES}/agenda.webp`}
            alt="Agenda de la semaine dans ClinikDent, avec les rendez-vous et le numéro de chaque patient"
            width={1920}
            height={1140}
            className="relative -mb-10 w-full rounded-t-xl border border-white/10 shadow-2xl sm:-mb-20"
          />
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-36">
          <h2 className="font-display text-3xl font-semibold text-primary-900 sm:text-4xl">Ça vous parle ?</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {PROBLEMES.map(({ titre, texte }) => (
              <div key={titre} className="border-t-2 border-accent-500 pt-4">
                <h3 className="text-lg font-semibold text-primary-900">{titre}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="sr-only">Ce que fait ClinikDent</h2>

            <Atout
              titre="Chaque dent dans le dossier"
              texte="Touchez une dent et notez son état : carie, couronne, endo, à traiter. Vous retrouvez la bouche du patient à chaque visite."
            >
              <img
                src={`${IMAGES}/schema.webp`}
                alt="Schéma dentaire d’un patient, avec une couleur par état de dent"
                width={1536}
                height={1140}
                loading="lazy"
                className="w-full rounded-xl border border-slate-200 shadow-lg"
              />
            </Atout>

            <Atout
              inverse
              titre="Chaque dinar avec sa date"
              texte="Espèces, chèques, D17, CNAM : les encaissements sont rangés par date dans la fiche du patient, avec ce qu’il reste à payer."
            >
              <Telephone image="encaissements.webp" alt="Journal des encaissements d’un patient, rangés par mois" />
            </Atout>

            <Atout
              titre="La caisse du soir en un coup d’œil"
              texte="La recette du jour par mode de paiement, et les chèques à encaisser, pour ne plus en oublier un."
            >
              <Telephone image="caisse.webp" alt="Caisse du jour avec le total par mode de paiement" />
            </Atout>

            <Atout
              inverse
              titre="Le rappel WhatsApp en un clic"
              texte="Le message est déjà écrit, en français ou en arabe. Un clic ouvre WhatsApp, vous appuyez sur Envoyer, et vous voyez qui a été rappelé."
            >
              <Telephone image="rappels.webp" alt="Liste des patients à rappeler pour le lendemain" />
            </Atout>

            <Atout
              titre="Vos patients réservent en ligne"
              texte="Votre cabinet a son lien. Le patient choisit une heure libre, en français ou en arabe, sans créer de compte. Rien n’entre dans votre agenda sans votre accord."
            >
              <div className="grid grid-cols-2 gap-3">
                <Telephone image="reservation.webp" alt="Page de réservation vue par le patient" />
                <Telephone image="demandes.webp" alt="Demandes de rendez-vous à confirmer par le cabinet" />
              </div>
            </Atout>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="font-display text-3xl font-semibold text-primary-900 sm:text-4xl">Comment se passe le test</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {ETAPES.map(({ titre, texte }, i) => (
              <li key={titre}>
                <span className="font-display text-4xl font-semibold text-accent-600">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold text-primary-900">{titre}</h3>
                <p className="mt-1 leading-relaxed text-slate-600">{texte}</p>
              </li>
            ))}
          </ol>
          <BoutonWhatsApp className="mt-10 w-full sm:w-auto" />
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="font-display text-3xl font-semibold text-primary-900 sm:text-4xl">Vos questions</h2>
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {QUESTIONS.map(({ question, reponse }) => (
                <details key={question} className="group py-4">
                  <summary className="cursor-pointer text-lg font-semibold text-primary-900">{question}</summary>
                  <p className="mt-2 leading-relaxed text-slate-600">{reponse}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary-950 px-4 py-14 text-center text-white sm:px-6">
        <p className="mx-auto max-w-2xl font-display text-3xl font-semibold">Essayez ClinikDent dans votre cabinet</p>
        <p className="mt-3 text-white/70">Un mois gratuit, sans engagement.</p>
        <BoutonWhatsApp className="mt-6 w-full sm:w-auto" />
        <p className="mt-8 text-sm text-white/50">Captures réalisées sur un cabinet fictif.</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3 sm:hidden">
        <BoutonWhatsApp className="w-full" />
      </div>
    </div>
  );
}
