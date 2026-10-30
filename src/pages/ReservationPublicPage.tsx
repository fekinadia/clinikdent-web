import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPin, Phone } from 'lucide-react';
import clsx from 'clsx';
import type { AxiosError } from 'axios';
import { CabinetPublic, reservationPublicApi } from '@/api/endpoints';
import { LangueMessage, lienCarte } from '@/lib/whatsappRappel';

// Réservation en ligne (2026-10-30) : page ouverte par le patient, sans compte.
// Elle ne reçoit de l'API que les infos du cabinet et les heures libres.

const DELAI_REVEIL_MS = 4000;

const TEXTES = {
  fr: {
    titre: 'Prendre rendez-vous',
    introuvableTitre: 'Page introuvable',
    introuvable: "Cette page de réservation n'existe pas ou n'est plus active.",
    chargement: 'Chargement...',
    reveil: "Connexion en cours, cela peut prendre jusqu'à une minute.",
    choisirJour: 'Choisissez un jour',
    choisirHeure: 'Choisissez une heure',
    aucunCreneau: 'Aucun créneau libre ce jour-là. Choisissez un autre jour.',
    aucunJour: 'Aucun créneau en ligne pour le moment. Appelez le cabinet.',
    vosCoordonnees: 'Vos coordonnées',
    prenom: 'Prénom',
    nom: 'Nom',
    telephone: 'Téléphone',
    motif: 'Motif (facultatif)',
    motifExemple: 'Ex. : douleur, détartrage, contrôle',
    envoyer: 'Envoyer ma demande',
    envoi: 'Envoi...',
    confidentialite: 'Vos coordonnées sont transmises uniquement au cabinet, pour traiter votre demande.',
    envoyeTitre: 'Demande envoyée',
    envoyeTexte: 'Le cabinet va vous confirmer votre rendez-vous.',
    aHeure: 'à',
    appeler: 'Appeler le cabinet',
    creneauPris: "Ce créneau vient d'être pris. Choisissez-en un autre.",
    tropDeDemandes: 'Trop de demandes en attente. Réessayez plus tard ou appelez le cabinet.',
    telephoneInvalide: 'Vérifiez votre numéro de téléphone.',
    erreur: 'Connexion impossible. Vérifiez Internet et réessayez.',
    reessayer: 'Réessayer',
    propulse: 'Réservation en ligne par ClinikDent',
  },
  ar: {
    titre: 'حجز موعد',
    introuvableTitre: 'الصفحة غير موجودة',
    introuvable: 'صفحة الحجز هذه غير موجودة أو لم تعد مفعّلة.',
    chargement: 'جارٍ التحميل...',
    reveil: 'جارٍ الاتصال، قد يستغرق ذلك حتى دقيقة واحدة.',
    choisirJour: 'اختر اليوم',
    choisirHeure: 'اختر الساعة',
    aucunCreneau: 'لا يوجد موعد متاح في هذا اليوم. اختر يوما آخر.',
    aucunJour: 'لا توجد مواعيد متاحة حاليا. يرجى الاتصال بالعيادة.',
    vosCoordonnees: 'معلوماتك',
    prenom: 'الاسم',
    nom: 'اللقب',
    telephone: 'رقم الهاتف',
    motif: 'سبب الزيارة (اختياري)',
    motifExemple: 'مثال: ألم، تنظيف الأسنان، مراقبة',
    envoyer: 'إرسال طلبي',
    envoi: 'جارٍ الإرسال...',
    confidentialite: 'تُرسل معلوماتك إلى العيادة فقط لمعالجة طلبك.',
    envoyeTitre: 'تم إرسال طلبك',
    envoyeTexte: 'ستؤكد لك العيادة موعدك.',
    aHeure: 'على الساعة',
    appeler: 'الاتصال بالعيادة',
    creneauPris: 'تم حجز هذا الموعد للتو. اختر موعدا آخر.',
    tropDeDemandes: 'طلبات كثيرة في الانتظار. حاول لاحقا أو اتصل بالعيادة.',
    telephoneInvalide: 'تحقق من رقم هاتفك.',
    erreur: 'تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.',
    reessayer: 'إعادة المحاولة',
    propulse: 'الحجز عبر الإنترنت من ClinikDent',
  },
};

function joursProposes(cabinet: CabinetPublic): string[] {
  const jours: string[] = [];
  const fin = new Date(`${cabinet.dernierJour}T12:00:00Z`);
  for (let d = new Date(`${cabinet.aujourdhui}T12:00:00Z`); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    if (cabinet.joursOuverts.includes(d.getUTCDay())) jours.push(d.toISOString().slice(0, 10));
  }
  return jours;
}

function formatJour(date: string, langue: LangueMessage, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(langue === 'ar' ? 'ar-TN' : 'fr-FR', { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

const pasDeReessaiSi404 = (echecs: number, erreur: Error) =>
  (erreur as AxiosError).response?.status !== 404 && echecs < 2;

export function ReservationPublicPage() {
  const { slug = '' } = useParams();
  const queryClient = useQueryClient();
  const [langue, setLangue] = useState<LangueMessage>(() =>
    navigator.language?.startsWith('ar') ? 'ar' : 'fr',
  );
  const [date, setDate] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(false);
  const [heure, setHeure] = useState<string | null>(null);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [gsm, setGsm] = useState('');
  const [motif, setMotif] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [reveil, setReveil] = useState(false);
  const t = TEXTES[langue];

  const cabinet = useQuery({
    queryKey: ['reservation-cabinet', slug],
    queryFn: () => reservationPublicApi.cabinet(slug),
    retry: pasDeReessaiSi404,
  });

  const jours = useMemo(() => (cabinet.data ? joursProposes(cabinet.data) : []), [cabinet.data]);

  const creneaux = useQuery({
    queryKey: ['reservation-creneaux', slug, date],
    queryFn: () => reservationPublicApi.creneaux(slug, date as string),
    enabled: !!date,
    staleTime: 0,
  });

  // Le serveur gratuit peut mettre près d'une minute à répondre au premier passage.
  useEffect(() => {
    const minuteur = setTimeout(() => setReveil(true), DELAI_REVEIL_MS);
    return () => clearTimeout(minuteur);
  }, []);

  useEffect(() => {
    if (cabinet.data) document.title = `${cabinet.data.nom} — ${t.titre}`;
  }, [cabinet.data, t.titre]);

  useEffect(() => {
    if (!date && jours.length > 0) setDate(jours[0]);
  }, [date, jours]);

  // Aujourd'hui est souvent complet : on avance seul jusqu'au premier jour libre,
  // tant que le patient n'a pas choisi lui-même.
  useEffect(() => {
    if (dateChoisie || !date || creneaux.data?.date !== date || creneaux.data.heures.length > 0) return;
    const suivant = jours[jours.indexOf(date) + 1];
    if (suivant) setDate(suivant);
  }, [creneaux.data, date, dateChoisie, jours]);

  const envoi = useMutation({
    mutationFn: () =>
      reservationPublicApi.envoyer(slug, {
        prenom,
        nom,
        gsm,
        motif: motif || undefined,
        date: date as string,
        heure: heure as string,
        langue,
        siteWeb: siteWeb || undefined,
      }),
    onSuccess: () => setEnvoye(true),
    onError: (e: AxiosError) => {
      const statut = e.response?.status;
      if (statut === 409) {
        setErreur(t.creneauPris);
        setHeure(null);
        queryClient.invalidateQueries({ queryKey: ['reservation-creneaux', slug, date] });
      } else if (statut === 429) {
        setErreur(t.tropDeDemandes);
      } else if (statut === 400) {
        setErreur(t.telephoneInvalide);
      } else {
        setErreur(t.erreur);
      }
    },
  });

  const choisirJour = (jour: string) => {
    setDate(jour);
    setDateChoisie(true);
    setHeure(null);
    setErreur('');
  };

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    setErreur('');
    envoi.mutate();
  };

  const introuvable = (cabinet.error as AxiosError | null)?.response?.status === 404;

  return (
    <div dir={langue === 'ar' ? 'rtl' : 'ltr'} lang={langue} className="min-h-screen bg-slate-50 text-slate-900">
      <main className="relative max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-full bg-slate-200/70 p-0.5" role="group" aria-label="Langue">
            {(['fr', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={langue === l}
                onClick={() => setLangue(l)}
                className={clsx(
                  'min-w-[44px] px-3 py-1.5 rounded-full text-sm font-medium',
                  langue === l ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600',
                )}
              >
                {l === 'fr' ? 'FR' : 'عربية'}
              </button>
            ))}
          </div>
        </div>

        {introuvable ? (
          <section className="card p-6 text-center">
            <h1 className="font-display text-xl font-semibold">{t.introuvableTitre}</h1>
            <p className="text-sm text-slate-600 mt-2">{t.introuvable}</p>
          </section>
        ) : cabinet.isError ? (
          <section className="card p-6 text-center">
            <p className="text-sm text-slate-600">{t.erreur}</p>
            <button type="button" className="btn-primary mt-4" onClick={() => cabinet.refetch()}>
              {t.reessayer}
            </button>
          </section>
        ) : !cabinet.data ? (
          <section className="card p-6 text-center">
            <p className="text-sm text-slate-600">{reveil ? t.reveil : t.chargement}</p>
          </section>
        ) : envoye ? (
          <section className="card p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
            <h1 className="font-display text-xl font-semibold mt-3">{t.envoyeTitre}</h1>
            <p className="text-sm text-slate-600 mt-2">{t.envoyeTexte}</p>
            <p className="mt-4 font-medium">
              {formatJour(date as string, langue, { weekday: 'long', day: 'numeric', month: 'long' })} {t.aHeure}{' '}
              <span dir="ltr">{heure}</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">{cabinet.data.nom}</p>
            {cabinet.data.telephone && (
              <a href={`tel:${cabinet.data.telephone}`} className="btn-ghost mt-4">
                <Phone size={16} /> {t.appeler}
              </a>
            )}
          </section>
        ) : (
          <>
            <header className="mb-5">
              <p className="text-sm font-medium text-primary-600">{t.titre}</p>
              <h1 className="font-display text-2xl font-semibold mt-0.5 break-words"><bdi>{cabinet.data.nom}</bdi></h1>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {cabinet.data.adresse && (
                  <a
                    href={lienCarte(cabinet.data.adresse)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-1.5 hover:text-primary-600"
                  >
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span dir="auto" className="break-words min-w-0">{cabinet.data.adresse}</span>
                  </a>
                )}
                {cabinet.data.telephone && (
                  <a href={`tel:${cabinet.data.telephone}`} className="flex items-center gap-1.5 hover:text-primary-600">
                    <Phone size={16} className="shrink-0" />
                    <span dir="ltr">{cabinet.data.telephone}</span>
                  </a>
                )}
              </div>
            </header>

            {jours.length === 0 ? (
              <section className="card p-6 text-center">
                <p className="text-sm text-slate-600">{t.aucunJour}</p>
              </section>
            ) : (
              <>
                <section className="card p-4">
                  <h2 className="font-semibold text-sm">{t.choisirJour}</h2>
                  <div className="-mx-4 px-4 mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t.choisirJour}>
                    {jours.map((jour) => (
                      <button
                        key={jour}
                        type="button"
                        aria-pressed={date === jour}
                        onClick={() => choisirJour(jour)}
                        className={clsx(
                          'shrink-0 min-w-[64px] rounded-lg border px-2 py-2 text-center transition-colors',
                          date === jour
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-primary-500',
                        )}
                      >
                        <span className="block text-xs">{formatJour(jour, langue, { weekday: 'short' })}</span>
                        <span className="block text-lg font-semibold leading-tight">
                          {formatJour(jour, langue, { day: 'numeric' })}
                        </span>
                        <span className="block text-xs">{formatJour(jour, langue, { month: 'short' })}</span>
                      </button>
                    ))}
                  </div>

                  <h2 className="font-semibold text-sm mt-4">{t.choisirHeure}</h2>
                  {creneaux.isError ? (
                    <div className="mt-2">
                      <p className="text-sm text-slate-600">{t.erreur}</p>
                      <button type="button" className="btn-ghost !px-0" onClick={() => creneaux.refetch()}>
                        {t.reessayer}
                      </button>
                    </div>
                  ) : !creneaux.data || creneaux.data.date !== date ? (
                    <p className="text-sm text-slate-500 mt-2">{reveil ? t.reveil : t.chargement}</p>
                  ) : creneaux.data.heures.length === 0 ? (
                    <p className="text-sm text-slate-500 mt-2">{t.aucunCreneau}</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3" dir="ltr">
                      {creneaux.data.heures.map((h) => (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={heure === h}
                          onClick={() => {
                            setHeure(h);
                            setErreur('');
                          }}
                          className={clsx(
                            'rounded-lg border py-2.5 text-sm font-medium tabular-nums transition-colors',
                            heure === h
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-primary-500',
                          )}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                  {erreur && !heure && (
                    <p role="alert" className="text-sm text-rose-700 mt-3">
                      {erreur}
                    </p>
                  )}
                </section>

                {heure && (
                  <form onSubmit={envoyer} className="card p-4 mt-4 space-y-3">
                    <h2 className="font-semibold text-sm">{t.vosCoordonnees}</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="rdv-prenom" className="label">{t.prenom}</label>
                        <input
                          id="rdv-prenom"
                          className="input !text-base"
                          required
                          maxLength={100}
                          autoComplete="given-name"
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="rdv-nom" className="label">{t.nom}</label>
                        <input
                          id="rdv-nom"
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
                      <label htmlFor="rdv-gsm" className="label">{t.telephone}</label>
                      <input
                        id="rdv-gsm"
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
                    </div>
                    <div>
                      <label htmlFor="rdv-motif" className="label">{t.motif}</label>
                      <input
                        id="rdv-motif"
                        className="input !text-base"
                        maxLength={200}
                        placeholder={t.motifExemple}
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                      />
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

                    {erreur && (
                      <p role="alert" className="text-sm text-rose-700">
                        {erreur}
                      </p>
                    )}
                    <button type="submit" className="btn-primary w-full !py-3" disabled={envoi.isPending}>
                      {envoi.isPending ? t.envoi : t.envoyer}
                    </button>
                    <p className="text-xs text-slate-500">{t.confidentialite}</p>
                  </form>
                )}
              </>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">{t.propulse}</p>
      </main>
    </div>
  );
}
