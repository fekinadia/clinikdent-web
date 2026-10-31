import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Inbox, MessageCircle, Phone, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  cabinetApi,
  DemandeRdv,
  DemandeTraitee,
  HorairesReservation,
  reservationApi,
  ReglagesReservation,
} from '@/api/endpoints';
import type { CabinetInfo } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/auth-store';
import { formatTime } from '@/lib/utils';
import {
  formatDateRappel,
  LangueMessage,
  lienCarte,
  lienWhatsApp,
  remplirModele,
  REPONSE_DEMANDE,
} from '@/lib/whatsappRappel';

// Réservation en ligne (2026-10-30) : demandes envoyées depuis le lien public
// du cabinet, et réglages de ce lien.

type Onglet = 'demandes' | 'reglages';
type Reponse = keyof typeof REPONSE_DEMANDE;

// Seuls les numéros de demande restent dans ce navigateur, jamais le nom ou le
// téléphone du patient.
const CLE_PATIENTS_PREVENUS = 'clinikdent_demandes_prevenues';
const PATIENTS_PREVENUS_MAX = 200;

function lirePatientsPrevenus(): number[] {
  try {
    const ids = JSON.parse(localStorage.getItem(CLE_PATIENTS_PREVENUS) ?? '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

const JOURS: [string, string][] = [
  ['1', 'Lundi'],
  ['2', 'Mardi'],
  ['3', 'Mercredi'],
  ['4', 'Jeudi'],
  ['5', 'Vendredi'],
  ['6', 'Samedi'],
  ['0', 'Dimanche'],
];

const DUREES = [15, 20, 30, 45, 60];

function messageReponse(
  demande: Omit<DemandeRdv, 'patientsTrouves'>,
  reponse: Reponse,
  cabinet?: CabinetInfo,
): string {
  const langue: LangueMessage = demande.langue === 'ar' ? 'ar' : 'fr';
  const adresse = cabinet?.adresse ?? '';
  return remplirModele(REPONSE_DEMANDE[reponse][langue], {
    prenom: demande.prenom,
    nom: demande.nom,
    cabinet: cabinet?.nom ?? '',
    dentiste: '',
    date: formatDateRappel(new Date(demande.dateDebut), langue),
    heure: formatTime(demande.dateDebut),
    traitement: '',
    adresse,
    carte: adresse ? lienCarte(adresse) : '',
  });
}

/** Le numéro peut être partagé en famille : un dossier n'est proposé que si le prénom correspond. */
function dossierParDefaut(demande: DemandeRdv): number | undefined {
  const prenom = demande.prenom.trim().toLowerCase();
  return demande.patientsTrouves.find((p) => p.prenom.trim().toLowerCase() === prenom)?.id;
}

function messageErreur(error: unknown, secours: string): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) || secours;
}

export function ReservationPage() {
  const [onglet, setOnglet] = useState<Onglet>('demandes');
  const { data: compte } = useQuery({ queryKey: ['reservation-compte'], queryFn: reservationApi.compte });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Réservation en ligne</h1>
        <p className="text-xs text-slate-500 mt-0.5">Les patients choisissent un créneau, vous confirmez.</p>
        <div className="flex gap-1 mt-3" role="tablist">
          {(
            [
              ['demandes', `Demandes${compte?.enAttente ? ` (${compte.enAttente})` : ''}`],
              ['reglages', 'Réglages'],
            ] as const
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={onglet === id}
              onClick={() => setOnglet(id)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium',
                onglet === id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {libelle}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {onglet === 'demandes' ? <Demandes /> : <Reglages />}
        </div>
      </div>
    </>
  );
}

function Demandes() {
  const queryClient = useQueryClient();
  const [patientsPrevenus, setPatientsPrevenus] = useState(lirePatientsPrevenus);
  const [dossiers, setDossiers] = useState<Record<number, number | undefined>>({});

  const { data: demandes = [], isLoading, isError } = useQuery({
    queryKey: ['reservation-demandes'],
    queryFn: reservationApi.demandes,
    refetchInterval: 60_000,
  });
  const { data: traitees = [] } = useQuery({
    queryKey: ['reservation-a-prevenir'],
    queryFn: reservationApi.aPrevenir,
  });
  const { data: cabinetMe } = useQuery({ queryKey: ['cabinet-me'], queryFn: cabinetApi.me });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ['reservation-demandes'] });
    queryClient.invalidateQueries({ queryKey: ['reservation-compte'] });
    queryClient.invalidateQueries({ queryKey: ['reservation-a-prevenir'] });
  };

  const marquerPrevenu = (id: number) => {
    const ids = [...patientsPrevenus, id].slice(-PATIENTS_PREVENUS_MAX);
    setPatientsPrevenus(ids);
    try {
      localStorage.setItem(CLE_PATIENTS_PREVENUS, JSON.stringify(ids));
    } catch {
      // Stockage bloqué : la ligne disparaît quand même jusqu'au prochain chargement.
    }
  };

  const confirmer = useMutation({
    mutationFn: ({ demande, patientId }: { demande: DemandeRdv; patientId?: number }) =>
      reservationApi.confirmer(demande.id, patientId),
    onSuccess: () => {
      toast.success('Rendez-vous ajouté à l’agenda');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      rafraichir();
    },
    onError: (error) => {
      toast.error(messageErreur(error, 'Impossible de confirmer cette demande'));
      rafraichir();
    },
  });

  const refuser = useMutation({
    mutationFn: (demande: DemandeRdv) => reservationApi.refuser(demande.id),
    onSuccess: () => {
      toast.success('Demande refusée, le créneau est de nouveau libre');
      rafraichir();
    },
    onError: (error) => {
      toast.error(messageErreur(error, 'Impossible de refuser cette demande'));
      rafraichir();
    },
  });

  const enCours = confirmer.isPending || refuser.isPending;
  const cabinet = cabinetMe?.cabinet;
  const aPrevenir = traitees.filter((demande: DemandeTraitee) => !patientsPrevenus.includes(demande.id));

  return (
    <div className="space-y-4">
      {aPrevenir.map((demande) => (
        <div
          key={demande.id}
          className="flex items-center gap-3 flex-wrap rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <span className="flex-1 min-w-[180px]">
            {demande.statut === 'confirmee' ? 'Confirmé' : 'Refusé'} : prévenez{' '}
            <strong>{demande.prenom}</strong> sur WhatsApp
          </span>
          <a
            href={lienWhatsApp(demande.gsm, messageReponse(demande, demande.statut, cabinet))}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !py-1.5 !bg-emerald-600 hover:!bg-emerald-700"
            onClick={() => marquerPrevenu(demande.id)}
          >
            <MessageCircle size={16} /> Envoyer le message
          </a>
          <button
            type="button"
            className="btn-ghost !p-1.5"
            aria-label="Fermer sans envoyer"
            title="Fermer sans envoyer"
            onClick={() => marquerPrevenu(demande.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <section className="card p-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : isError ? (
          <p className="text-sm text-rose-700">Impossible de charger les demandes. Réessayez dans un instant.</p>
        ) : demandes.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="Aucune demande en attente"
            description="Les demandes envoyées depuis votre lien apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {demandes.map((demande) => {
              const passee = new Date(demande.dateDebut) <= new Date();
              const dossier = demande.id in dossiers ? dossiers[demande.id] : dossierParDefaut(demande);
              return (
                <li key={demande.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm first-letter:uppercase">
                        {formatDateRappel(new Date(demande.dateDebut), 'fr')} à {formatTime(demande.dateDebut)}
                        {passee && <span className="badge badge-warning ml-2">Date passée</span>}
                      </p>
                      <p className="text-sm text-slate-900 break-words">
                        {demande.prenom} {demande.nom}
                      </p>
                      <a
                        href={`tel:+${demande.gsm}`}
                        className="text-xs text-slate-500 inline-flex items-center gap-1 hover:text-primary-600"
                      >
                        <Phone size={12} /> +{demande.gsm}
                      </a>
                      {demande.motif && <p className="text-xs text-slate-600 mt-0.5 break-words">{demande.motif}</p>}
                    </div>
                  </div>

                  {demande.patientsTrouves.length > 0 && (
                    <div>
                      <label htmlFor={`dossier-${demande.id}`} className="label">Dossier patient</label>
                      <select
                        id={`dossier-${demande.id}`}
                        className="input"
                        value={dossier ?? ''}
                        onChange={(e) =>
                          setDossiers((d) => ({
                            ...d,
                            [demande.id]: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                      >
                        {demande.patientsTrouves.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.prenom} {p.nom} ({p.estProspect ? 'prospect' : `dossier ${p.numeroDossier}`})
                          </option>
                        ))}
                        <option value="">Nouveau dossier pour {demande.prenom} {demande.nom}</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {!passee && (
                      <button
                        type="button"
                        className="btn-primary !py-1.5"
                        disabled={enCours}
                        onClick={() => confirmer.mutate({ demande, patientId: dossier })}
                      >
                        <Check size={16} /> Confirmer
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-ghost !py-1.5"
                      disabled={enCours}
                      onClick={() => refuser.mutate(demande)}
                    >
                      <X size={16} /> {passee ? 'Retirer' : 'Refuser'}
                    </button>
                    <a
                      href={lienWhatsApp(demande.gsm, messageReponse(demande, 'question', cabinet))}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost !py-1.5 !text-emerald-700"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Reglages() {
  const queryClient = useQueryClient();
  const peutModifier = useAuthStore((s) => s.user?.role) === 'admin';
  const [form, setForm] = useState<ReglagesReservation | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reservation-reglages'],
    queryFn: reservationApi.reglages,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const enregistrer = useMutation({
    mutationFn: (reglages: ReglagesReservation) => reservationApi.modifierReglages(reglages),
    onSuccess: (reglages) => {
      queryClient.setQueryData(['reservation-reglages'], reglages);
      queryClient.invalidateQueries({ queryKey: ['cabinet-me'] });
      toast.success('Réglages enregistrés');
    },
    onError: (error) => {
      toast.error(messageErreur(error, 'Impossible d’enregistrer les réglages'));
    },
  });

  if (isLoading) return <p className="text-sm text-slate-500">Chargement...</p>;
  if (isError || !form) {
    return <p className="text-sm text-rose-700">Impossible de charger les réglages. Réessayez dans un instant.</p>;
  }

  const debutLien = `${window.location.origin}/rdv/`;
  const lien = `${debutLien}${data?.slug ?? form.slug}`;
  const modifierHoraires = (jour: string, plages: HorairesReservation[string]) => {
    const horaires = { ...form.horaires };
    if (plages.length > 0) horaires[jour] = plages;
    else delete horaires[jour];
    setForm({ ...form, horaires });
  };

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible : sélectionnez le lien à la main');
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer.mutate(form);
      }}
    >
      <fieldset disabled={!peutModifier} className="space-y-4">
        <section className="card p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activer la réservation en ligne
          </label>
          <p className="text-xs text-slate-500">
            Désactivée, le lien ne montre plus rien aux patients. Les demandes déjà reçues restent ici.
          </p>

          <div>
            <label htmlFor="reservation-slug" className="label">Adresse du lien</label>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 break-all">{debutLien}</span>
              <input
                id="reservation-slug"
                className="input !w-auto flex-1 min-w-[160px]"
                required
                maxLength={60}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
            </div>
          </div>

          {data?.active && (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" className="btn-ghost !py-1.5" onClick={copierLien}>
                <Copy size={16} /> Copier le lien
              </button>
              <a href={lien} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5">
                <ExternalLink size={16} /> Ouvrir la page
              </a>
            </div>
          )}
        </section>

        <section className="card p-4 space-y-3">
          <div>
            <label htmlFor="reservation-adresse" className="label">Adresse du cabinet</label>
            <input
              id="reservation-adresse"
              className="input"
              maxLength={300}
              placeholder="Ex. : 12 avenue Habib Bourguiba, Tunis"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reservation-telephone" className="label">Téléphone du cabinet</label>
            <input
              id="reservation-telephone"
              type="tel"
              className="input"
              maxLength={30}
              placeholder="Ex. : 71 000 000"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
          </div>
          <p className="text-xs text-slate-500">
            Affichés sur la page patient, dans les messages WhatsApp et sur vos documents imprimés.
          </p>
        </section>

        <section className="card p-4 space-y-3">
          <div>
            <label htmlFor="reservation-duree" className="label">Durée d'un créneau</label>
            <select
              id="reservation-duree"
              className="input !w-auto"
              value={form.dureeCreneau}
              onChange={(e) => setForm({ ...form, dureeCreneau: Number(e.target.value) })}
            >
              {DUREES.map((duree) => (
                <option key={duree} value={duree}>
                  {duree} minutes
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="label">Horaires proposés</h2>
            <ul className="divide-y divide-slate-100">
              {JOURS.map(([jour, libelle]) => {
                const plages = form.horaires[jour] ?? [];
                return (
                  <li key={jour} className="py-2 flex items-start gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm w-28 pt-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={plages.length > 0}
                        onChange={(e) =>
                          modifierHoraires(jour, e.target.checked ? [{ debut: '09:00', fin: '13:00' }] : [])
                        }
                      />
                      {libelle}
                    </label>

                    {plages.length === 0 ? (
                      <span className="text-sm text-slate-400 pt-1.5">Fermé</span>
                    ) : (
                      <div className="flex-1 min-w-[230px] space-y-1.5">
                        {plages.map((plage, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              type="time"
                              className="input !w-auto !py-1"
                              aria-label={`${libelle}, début de la plage ${i + 1}`}
                              required
                              value={plage.debut}
                              onChange={(e) =>
                                modifierHoraires(jour, plages.map((p, j) => (j === i ? { ...p, debut: e.target.value } : p)))
                              }
                            />
                            <span className="text-slate-400">à</span>
                            <input
                              type="time"
                              className="input !w-auto !py-1"
                              aria-label={`${libelle}, fin de la plage ${i + 1}`}
                              required
                              value={plage.fin}
                              onChange={(e) =>
                                modifierHoraires(jour, plages.map((p, j) => (j === i ? { ...p, fin: e.target.value } : p)))
                              }
                            />
                            {plages.length === 2 && (
                              <button
                                type="button"
                                className="btn-ghost !p-1"
                                aria-label={`Retirer la plage ${i + 1} du ${libelle}`}
                                onClick={() => modifierHoraires(jour, plages.filter((_, j) => j !== i))}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        {plages.length === 1 && (
                          <button
                            type="button"
                            className="btn-ghost !px-1 !py-0.5 text-xs"
                            onClick={() => modifierHoraires(jour, [...plages, { debut: '15:00', fin: '18:00' }])}
                          >
                            <Plus size={14} /> Ajouter l'après-midi
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </fieldset>

      {peutModifier ? (
        <button type="submit" className="btn-primary" disabled={enregistrer.isPending}>
          {enregistrer.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      ) : (
        <p className="text-xs text-slate-500">Seul un compte administrateur peut modifier ces réglages.</p>
      )}
    </form>
  );
}
