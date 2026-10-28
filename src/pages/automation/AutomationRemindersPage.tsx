import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BellRing, Check, CheckCircle2, MessageCircle, PhoneOff, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  appointmentsApi,
  cabinetApi,
  patientsApi,
  rappelsApi,
  RappelAppointment,
  whatsappApi,
  WhatsAppTemplate,
} from '@/api/endpoints';
import type { CabinetInfo } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/auth-store';
import { formatTime } from '@/lib/utils';
import {
  bornesJournee,
  formatDateRappel,
  LangueMessage,
  lienCarte,
  lienWhatsApp,
  RAPPEL_PAR_DEFAUT,
  remplirModele,
} from '@/lib/whatsappRappel';

// Rappels WhatsApp « en un geste » (2026-10-23). Remplace l'ancienne liste
// des rappels automatiques, qui affichait « Envoyé » alors que l'envoi
// WhatsApp automatique n'est pas branché (aucun message ne partait).

type Jour = 'aujourdhui' | 'demain' | 'autre';

function dateDuJour(jour: Jour, autre: string): Date {
  const d = new Date();
  if (jour === 'demain') d.setDate(d.getDate() + 1);
  if (jour === 'autre' && autre) {
    const [y, m, j] = autre.split('-').map(Number);
    return new Date(y, m - 1, j);
  }
  return d;
}

function construireMessage(
  rdv: RappelAppointment,
  modeles: WhatsAppTemplate[],
  cabinet?: CabinetInfo,
): string {
  const langue: LangueMessage = rdv.patient.langueMessages === 'ar' ? 'ar' : 'fr';
  // La liste des modèles arrive du plus récent au plus ancien.
  const modele = modeles.find((m) => (m.langue ?? 'fr') === langue)?.contenu ?? RAPPEL_PAR_DEFAUT[langue];
  const date = new Date(rdv.dateDebut);
  const adresse = cabinet?.adresse?.trim() ?? '';
  return remplirModele(modele, {
    prenom: rdv.patient.prenom,
    nom: rdv.patient.nom,
    cabinet: cabinet?.nom ?? '',
    dentiste: rdv.medecin ? `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}` : '',
    date: formatDateRappel(date, langue),
    heure: formatTime(date),
    traitement: rdv.type?.libelle ?? '',
    adresse,
    carte: adresse ? lienCarte(adresse) : '',
  });
}

export function AutomationRemindersPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const peutRappeler = role !== 'comptable';

  const [jour, setJour] = useState<Jour>('demain');
  const [autreDate, setAutreDate] = useState('');
  const { debut, fin } = useMemo(() => bornesJournee(dateDuJour(jour, autreDate)), [jour, autreDate]);
  const queryKey = ['rappels', debut.toISOString()];

  const { data: rdvs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => rappelsApi.list(debut, fin),
  });
  const { data: modeles = [] } = useQuery({
    queryKey: ['whatsapp-templates', 'reminder'],
    queryFn: () => whatsappApi.listTemplates('reminder'),
  });
  const { data: cabinetMe } = useQuery({
    queryKey: ['cabinet-me'],
    queryFn: cabinetApi.me,
  });

  const majLigne = (maj: RappelAppointment) => {
    qc.setQueryData<RappelAppointment[]>(queryKey, (liste) =>
      liste?.map((r) => (r.id === maj.id ? { ...r, ...maj } : r)),
    );
    qc.invalidateQueries({ queryKey: ['rappels-a-faire'] });
  };

  const marquer = useMutation({
    mutationFn: rappelsApi.marquer,
    onSuccess: majLigne,
    onError: () => toast.error("Le rappel n'a pas pu être noté. Réessayez."),
  });
  const annuler = useMutation({
    mutationFn: rappelsApi.annuler,
    onSuccess: majLigne,
    onError: () => toast.error("L'annulation n'a pas pu être enregistrée."),
  });
  const confirmer = useMutation({
    mutationFn: (id: number) => appointmentsApi.update(id, { statut: 'confirme' }),
    onSuccess: (_, id) => {
      qc.setQueryData<RappelAppointment[]>(queryKey, (liste) =>
        liste?.map((r) => (r.id === id ? { ...r, statut: 'confirme' } : r)),
      );
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Rendez-vous confirmé');
    },
    onError: () => toast.error("Le rendez-vous n'a pas pu être confirmé."),
  });
  const changerLangue = useMutation({
    mutationFn: ({ patientId, langue }: { patientId: number; langue: LangueMessage }) =>
      patientsApi.updateLangueMessages(patientId, langue),
    onSuccess: (_, { patientId, langue }) => {
      qc.setQueryData<RappelAppointment[]>(queryKey, (liste) =>
        liste?.map((r) =>
          r.patient.id === patientId ? { ...r, patient: { ...r.patient, langueMessages: langue } } : r,
        ),
      );
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
    },
    onError: () => toast.error("La langue n'a pas pu être enregistrée."),
  });

  function envoyer(rdv: RappelAppointment) {
    if (!rdv.patient.gsm) return;
    // Ouvert directement dans le clic (sinon le navigateur bloque la fenêtre).
    window.open(lienWhatsApp(rdv.patient.gsm, construireMessage(rdv, modeles, cabinetMe?.cabinet)), '_blank', 'noopener');
    marquer.mutate(rdv.id);
  }

  const avecNumero = rdvs.filter((r) => r.patient.gsm);
  const rappeles = avecNumero.filter((r) => r.rappelEnvoye).length;
  const sansNumero = rdvs.length - avecNumero.length;
  const progression = avecNumero.length ? Math.round((rappeles / avecNumero.length) * 100) : 0;
  const titreJour = formatDateRappel(debut, 'fr');

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold">Rappels WhatsApp</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{titreJour}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['aujourdhui', 'demain'] as const).map((j) => (
            <button
              key={j}
              onClick={() => setJour(j)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                jour === j ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {j === 'aujourdhui' ? "Aujourd'hui" : 'Demain'}
            </button>
          ))}
          <label className="sr-only" htmlFor="rappels-date">Autre date</label>
          <input
            id="rappels-date"
            type="date"
            className={clsx('input !w-auto !py-1 text-xs', jour === 'autre' && 'border-primary-500')}
            value={autreDate}
            onChange={(e) => {
              setAutreDate(e.target.value);
              setJour(e.target.value ? 'autre' : 'demain');
            }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <section className="card p-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700">
                {rappeles} / {avecNumero.length} rappelé{rappeles > 1 ? 's' : ''}
              </span>
              {avecNumero.length > 0 && rappeles === avecNumero.length && (
                <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 size={14} /> Tous rappelés
                </span>
              )}
            </div>
            <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progression}%` }} />
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            « Envoyer sur WhatsApp » ouvre WhatsApp avec le message prêt : il ne reste qu'à appuyer sur
            Envoyer. Le texte se modifie dans{' '}
            <Link to="/automatisation/whatsapp" className="text-primary-600 hover:underline">
              Automatisation › WhatsApp
            </Link>
            .
          </p>
        </section>

        <section className="card p-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : rdvs.length === 0 ? (
            <EmptyState
              icon={<BellRing size={48} />}
              title="Aucun rendez-vous à rappeler ce jour-là"
              description="Les rendez-vous annulés ou terminés ne sont pas listés."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rdvs.map((rdv) => {
                const langue: LangueMessage = rdv.patient.langueMessages === 'ar' ? 'ar' : 'fr';
                return (
                  <li key={rdv.id} className="py-3 flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm tabular-nums w-12">{formatTime(rdv.dateDebut)}</span>

                    <div className="min-w-[160px] flex-1">
                      <Link
                        to={`/patients/${rdv.patient.id}`}
                        className="font-medium text-sm text-slate-900 hover:text-primary-600"
                      >
                        {rdv.patient.prenom} {rdv.patient.nom}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {[rdv.type?.libelle, rdv.medecin && `Dr ${rdv.medecin.nom}`].filter(Boolean).join(' · ')}
                        {rdv.statut === 'confirme' && <span className="badge badge-info ml-2">Confirmé</span>}
                      </div>
                    </div>

                    <div className="inline-flex rounded-full bg-slate-100 p-0.5" role="group" aria-label="Langue du message">
                      {(['fr', 'ar'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          disabled={!peutRappeler || changerLangue.isPending}
                          aria-pressed={langue === l}
                          onClick={() => langue !== l && changerLangue.mutate({ patientId: rdv.patient.id, langue: l })}
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            langue === l ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500',
                          )}
                          title={l === 'fr' ? 'Message en français' : 'Message en arabe'}
                        >
                          {l === 'fr' ? 'FR' : 'ع'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end min-w-[220px]">
                      {!rdv.patient.gsm ? (
                        <Link
                          to={`/patients/${rdv.patient.id}`}
                          className="text-xs text-amber-700 inline-flex items-center gap-1 hover:underline"
                        >
                          <PhoneOff size={14} /> Pas de numéro : l'ajouter dans la fiche
                        </Link>
                      ) : rdv.rappelEnvoye ? (
                        <>
                          <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                            <Check size={14} /> Rappelé
                            {rdv.rappelEnvoyeAt && <> à {formatTime(rdv.rappelEnvoyeAt)}</>}
                            {rdv.rappelEnvoyeParUser && <> ({rdv.rappelEnvoyeParUser.prenom})</>}
                          </span>
                          {peutRappeler && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost !px-2 !py-1 text-xs"
                                onClick={() => envoyer(rdv)}
                              >
                                Renvoyer
                              </button>
                              <button
                                type="button"
                                className="btn-ghost !px-2 !py-1 text-xs"
                                onClick={() => annuler.mutate(rdv.id)}
                                title="Annuler « Rappelé » (noté par erreur)"
                              >
                                <Undo2 size={14} /> Annuler
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        peutRappeler && (
                          <button
                            type="button"
                            onClick={() => envoyer(rdv)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-1.5"
                          >
                            <MessageCircle size={16} /> Envoyer sur WhatsApp
                          </button>
                        )
                      )}
                      {peutRappeler && rdv.statut === 'planifie' && (
                        <button
                          type="button"
                          className="btn-ghost !px-2 !py-1 text-xs"
                          disabled={confirmer.isPending}
                          onClick={() => confirmer.mutate(rdv.id)}
                          title="Le patient a répondu : marquer le rendez-vous comme confirmé"
                        >
                          Confirmé
                        </button>
                      )}
                    </div>

                    {rdv.patient.gsm && (
                      <details className="basis-full min-w-0 sm:pl-[60px] text-xs text-slate-500">
                        <summary className="cursor-pointer w-fit">Voir le message</summary>
                        <p
                          dir={langue === 'ar' ? 'rtl' : 'ltr'}
                          className="mt-2 whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-700"
                        >
                          {construireMessage(rdv, modeles, cabinetMe?.cabinet)}
                        </p>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {sansNumero > 0 && (
            <p className="text-xs text-amber-700 mt-3">
              {sansNumero} patient{sansNumero > 1 ? 's' : ''} sans numéro de téléphone : impossible de les rappeler sur WhatsApp.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
