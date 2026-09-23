import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsApi, calendarEventsApi, patientsApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import type { Patient, Appointment, CalendarEvent } from '@/types';

interface NewAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatient?: Patient | null;
  /** Rendez-vous existant à modifier. Si fourni, le dialogue passe en mode édition. */
  appointment?: Appointment | null;
  /** Événement d'agenda (sans patient) existant à modifier. Mutuellement
   * exclusif avec `appointment` — voir AgendaPage, qui ne passe jamais les
   * deux à la fois. */
  calendarEvent?: CalendarEvent | null;
}

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
];

const HOURS = Array.from({ length: 22 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const STATUT_OPTIONS: { value: Appointment['statut']; label: string }[] = [
  { value: 'planifie', label: 'Planifié' },
  { value: 'confirme', label: 'Confirmé' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
  { value: 'absent', label: 'Absent' },
];

// Deux types de blocs peuvent occuper l'agenda : un rendez-vous (lié à un
// patient, avec toute la mécanique clinique — statut, no-show, rappels...)
// ou un simple événement (titre libre, sans patient — pause, réunion,
// blocage de créneau). Ce toggle ne s'affiche qu'à la création : on ne
// permet pas de transformer l'un en l'autre après coup.
type CreationMode = 'patient' | 'evenement';

export function NewAppointmentDialog({
  isOpen,
  onClose,
  initialPatient,
  appointment,
  calendarEvent,
}: NewAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAppointmentEditMode = !!appointment;
  const isEventEditMode = !!calendarEvent;
  const isEditMode = isAppointmentEditMode || isEventEditMode;

  const [creationMode, setCreationMode] = useState<CreationMode>('patient');
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newGsm, setNewGsm] = useState('');
  const [newReseauSocial, setNewReseauSocial] = useState('');
  const [titre, setTitre] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [heure, setHeure] = useState('09:00');
  const [duree, setDuree] = useState(30);
  const [observation, setObservation] = useState('');
  const [statut, setStatut] = useState<Appointment['statut']>('planifie');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    if (isOpen && initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [isOpen, initialPatient]);

  // Pré-remplit le formulaire avec les infos du rendez-vous à modifier.
  useEffect(() => {
    if (isOpen && appointment) {
      const start = new Date(appointment.dateDebut);
      const end = new Date(appointment.dateFin);
      setDate(start.toISOString().split('T')[0]);
      setHeure(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
      setDuree(Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)));
      setObservation(appointment.observation || '');
      setStatut(appointment.statut || 'planifie');
    }
  }, [isOpen, appointment]);

  // Pré-remplit le formulaire avec les infos de l'événement à modifier.
  useEffect(() => {
    if (isOpen && calendarEvent) {
      const start = new Date(calendarEvent.dateDebut);
      const end = new Date(calendarEvent.dateFin);
      setDate(start.toISOString().split('T')[0]);
      setHeure(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
      setDuree(Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)));
      setTitre(calendarEvent.titre || '');
    }
  }, [isOpen, calendarEvent]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, limit: 8 }),
    enabled:
      creationMode === 'patient' && debouncedSearch.trim().length >= 2 && !selectedPatient && !isNewPatient,
  });

  const handleClose = () => {
    setCreationMode('patient');
    setPatientSearch('');
    setDebouncedSearch('');
    setSelectedPatient(null);
    setIsNewPatient(false);
    setNewPrenom('');
    setNewNom('');
    setNewGsm('');
    setNewReseauSocial('');
    setTitre('');
    setDate(new Date().toISOString().split('T')[0]);
    setHeure('09:00');
    setDuree(30);
    setObservation('');
    setStatut('planifie');
    onClose();
  };

  const createAppointment = useMutation({
    mutationFn: async () => {
      let patientId = selectedPatient?.id;

      if (isNewPatient) {
        if (!newPrenom.trim() || !newNom.trim()) {
          throw new Error('Le prénom et le nom du nouveau patient sont requis');
        }
        const created = await patientsApi.create({
          nom: newNom.trim(),
          prenom: newPrenom.trim(),
          gsm: newGsm.trim() || undefined,
          reseauSocial: newReseauSocial.trim() || undefined,
          // Fiche créée à la volée depuis l'Agenda : simple prospect tant
          // qu'elle n'est pas modifiée ou que le RDV n'est pas honoré.
          estProspect: true,
        });
        patientId = created.id;
      }

      if (!patientId) throw new Error('Sélectionnez un patient');

      const dateDebut = new Date(`${date}T${heure}:00`);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      return appointmentsApi.create({
        patientId,
        medecinId: user?.id,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        observation: observation || undefined,
      });
    },
    onSuccess: () => {
      toast.success(isNewPatient ? 'Patient et rendez-vous créés' : 'Rendez-vous créé');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-search'] });
      queryClient.invalidateQueries({ queryKey: ['patients-recalls'] });
      handleClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la création du rendez-vous";
      toast.error(msg);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async () => {
      if (!appointment) throw new Error('Rendez-vous introuvable');
      const dateDebut = new Date(`${date}T${heure}:00`);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      return appointmentsApi.update(appointment.id, {
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        observation: observation || undefined,
        statut,
      });
    },
    onSuccess: () => {
      toast.success('Rendez-vous modifié');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      handleClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la modification du rendez-vous";
      toast.error(msg);
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async () => {
      if (!appointment) throw new Error('Rendez-vous introuvable');
      return appointmentsApi.delete(appointment.id);
    },
    onSuccess: () => {
      toast.success('Rendez-vous supprimé');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Impossible de supprimer ce rendez-vous");
    },
  });

  // STEP 4 — action dédiée (endpoint POST /appointments/:id/no-show),
  // volontairement distincte du menu déroulant "Statut" ci-dessous : la
  // validation métier (RDV pas déjà résolu) et l'idempotence sont gérées
  // côté backend par cet endpoint spécifique, pas par le PATCH générique.
  const markNoShow = useMutation({
    mutationFn: async () => {
      if (!appointment) throw new Error('Rendez-vous introuvable');
      return appointmentsApi.markNoShow(appointment.id);
    },
    onSuccess: (updated) => {
      toast.success('Rendez-vous marqué comme no-show');
      setStatut(updated.statut);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de marquer ce rendez-vous comme no-show');
    },
  });

  // Événement sans patient — mêmes mutations en miroir, sur /calendar-events.
  const createEvent = useMutation({
    mutationFn: async () => {
      if (!titre.trim()) throw new Error("Le titre de l'événement est requis");
      const dateDebut = new Date(`${date}T${heure}:00`);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      return calendarEventsApi.create({
        titre: titre.trim(),
        medecinId: user?.id,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Événement créé');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      handleClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la création de l'événement";
      toast.error(msg);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async () => {
      if (!calendarEvent) throw new Error('Événement introuvable');
      if (!titre.trim()) throw new Error("Le titre de l'événement est requis");
      const dateDebut = new Date(`${date}T${heure}:00`);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      return calendarEventsApi.update(calendarEvent.id, {
        titre: titre.trim(),
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Événement modifié');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      handleClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la modification de l'événement";
      toast.error(msg);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      if (!calendarEvent) throw new Error('Événement introuvable');
      return calendarEventsApi.delete(calendarEvent.id);
    },
    onSuccess: () => {
      toast.success('Événement supprimé');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Impossible de supprimer cet événement");
    },
  });

  if (!isOpen) return null;

  const durationOptions = DURATIONS.some((d) => d.value === duree)
    ? DURATIONS
    : [...DURATIONS, { value: duree, label: `${duree} min` }].sort((a, b) => a.value - b.value);

  const isSaving =
    createAppointment.isPending || updateAppointment.isPending || createEvent.isPending || updateEvent.isPending;
  const isDeleting = deleteAppointment.isPending || deleteEvent.isPending;

  const handleDelete = () => {
    if (isEventEditMode) {
      if (confirm(`Supprimer l'événement${calendarEvent?.titre ? ` "${calendarEvent.titre}"` : ''} ?`)) {
        deleteEvent.mutate();
      }
      return;
    }
    if (!appointment) return;
    const nom = `${appointment.patient?.prenom ?? ''} ${appointment.patient?.nom ?? ''}`.trim();
    if (confirm(`Supprimer le rendez-vous${nom ? ` de ${nom}` : ''} ? Cette action est irréversible.`)) {
      deleteAppointment.mutate();
    }
  };

  const handleSave = () => {
    if (isEventEditMode) {
      updateEvent.mutate();
    } else if (isAppointmentEditMode) {
      updateAppointment.mutate();
    } else if (creationMode === 'evenement') {
      createEvent.mutate();
    } else {
      createAppointment.mutate();
    }
  };

  const saveLabel = isEditMode
    ? isSaving
      ? 'Enregistrement...'
      : 'Enregistrer'
    : isSaving
    ? 'Création...'
    : creationMode === 'evenement'
    ? "Créer l'événement"
    : isNewPatient
    ? 'Créer le patient et le RDV'
    : 'Créer le rendez-vous';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              {isEventEditMode
                ? "Modifier l'événement"
                : isAppointmentEditMode
                ? 'Modifier le rendez-vous'
                : 'Nouveau rendez-vous'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEventEditMode
                ? "Ajustez le titre, la date, l'heure ou la durée"
                : isAppointmentEditMode
                ? "Ajustez la date, l'heure, la durée ou les notes"
                : 'Planifiez un rendez-vous pour un patient, ou un simple événement sans patient'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!isEditMode && (
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-full">
              <button
                type="button"
                onClick={() => setCreationMode('patient')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  creationMode === 'patient' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Rendez-vous patient
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('evenement')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  creationMode === 'evenement' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Événement (sans patient)
              </button>
            </div>
          )}

          {isEventEditMode || (!isEditMode && creationMode === 'evenement') ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Titre
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Pause déjeuner, réunion, blocage de créneau..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Un événement n'est lié à aucun dossier patient : pas de rappel automatique, pas de suivi de présence.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Patient
                </label>
                {!selectedPatient && !isNewPatient && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsNewPatient(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Nouveau patient
                  </button>
                )}
              </div>

              {isAppointmentEditMode ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900">
                  {appointment?.patient?.prenom} {appointment?.patient?.nom}
                </div>
              ) : selectedPatient ? (
                <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-900">
                    {selectedPatient.prenom} {selectedPatient.nom}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                    type="button"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Changer
                  </button>
                </div>
              ) : isNewPatient ? (
                <div className="border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Fiche rapide du nouveau patient</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewPatient(false);
                        setNewPrenom('');
                        setNewNom('');
                        setNewGsm('');
                        setNewReseauSocial('');
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Rechercher un patient existant
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newPrenom}
                      onChange={(e) => setNewPrenom(e.target.value)}
                      placeholder="Prénom"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                    <input
                      type="text"
                      value={newNom}
                      onChange={(e) => setNewNom(e.target.value)}
                      placeholder="Nom"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={newGsm}
                    onChange={(e) => setNewGsm(e.target.value)}
                    placeholder="Téléphone (optionnel)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                  <input
                    type="text"
                    value={newReseauSocial}
                    onChange={(e) => setNewReseauSocial(e.target.value)}
                    placeholder="Réseau social (optionnel)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Rechercher un patient par nom..."
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                  {debouncedSearch.trim().length >= 2 && (
                    <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {isSearching && (
                        <div className="px-4 py-3 text-sm text-slate-400">Recherche...</div>
                      )}
                      {!isSearching && searchResults?.items.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400 flex items-center justify-between gap-2">
                          <span>Aucun patient trouvé</span>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = patientSearch.trim().split(/\s+/);
                              setNewPrenom(parts[0] || '');
                              setNewNom(parts.slice(1).join(' '));
                              setIsNewPatient(true);
                            }}
                            className="text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                          >
                            + Créer ce patient
                          </button>
                        </div>
                      )}
                      {!isSearching &&
                        searchResults?.items.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch('');
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                          >
                            <span className="font-medium text-slate-900">{p.prenom} {p.nom}</span>
                            {p.gsm && <span className="text-slate-400 ml-2">{p.gsm}</span>}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Heure</label>
              <select
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Durée</label>
            <select
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {durationOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {isAppointmentEditMode && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as Appointment['statut'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* STEP 4 — action dédiée, séparée du menu ci-dessus (voir markNoShow) */}
              {(statut as string) !== 'no_show' && statut !== 'annule' && statut !== 'termine' && (
                <button
                  type="button"
                  onClick={() => markNoShow.mutate()}
                  disabled={markNoShow.isPending}
                  className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {markNoShow.isPending ? 'Marquage en cours...' : 'Marquer comme no-show'}
                </button>
              )}
              {(statut as string) === 'no_show' && (
                <p className="mt-2 text-xs text-rose-600 font-medium">
                  Ce rendez-vous est marqué no-show.
                </p>
              )}
            </div>
          )}

          {!isEventEditMode && (!isEditMode ? creationMode === 'patient' : isAppointmentEditMode) && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">Observation (optionnel)</label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Motif de consultation, remarques..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
          {isEditMode ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#0e6ba8' }}
            >
              <Save className="w-4 h-4" />
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
