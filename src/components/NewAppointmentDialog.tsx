import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsApi, patientsApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import type { Patient, Appointment } from '@/types';

interface NewAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatient?: Patient | null;
  /** Rendez-vous existant à modifier. Si fourni, le dialogue passe en mode édition. */
  appointment?: Appointment | null;
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

export function NewAppointmentDialog({ isOpen, onClose, initialPatient, appointment }: NewAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isEditMode = !!appointment;

  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newGsm, setNewGsm] = useState('');
  const [newReseauSocial, setNewReseauSocial] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [heure, setHeure] = useState('09:00');
  const [duree, setDuree] = useState(30);
  const [observation, setObservation] = useState('');

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
    }
  }, [isOpen, appointment]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, limit: 8 }),
    enabled: debouncedSearch.trim().length >= 2 && !selectedPatient && !isNewPatient,
  });

  const handleClose = () => {
    setPatientSearch('');
    setDebouncedSearch('');
    setSelectedPatient(null);
    setIsNewPatient(false);
    setNewPrenom('');
    setNewNom('');
    setNewGsm('');
    setNewReseauSocial('');
    setDate(new Date().toISOString().split('T')[0]);
    setHeure('09:00');
    setDuree(30);
    setObservation('');
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

  if (!isOpen) return null;

  const durationOptions = DURATIONS.some((d) => d.value === duree)
    ? DURATIONS
    : [...DURATIONS, { value: duree, label: `${duree} min` }].sort((a, b) => a.value - b.value);

  const handleDelete = () => {
    if (!appointment) return;
    const nom = `${appointment.patient?.prenom ?? ''} ${appointment.patient?.nom ?? ''}`.trim();
    if (confirm(`Supprimer le rendez-vous${nom ? ` de ${nom}` : ''} ? Cette action est irréversible.`)) {
      deleteAppointment.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              {isEditMode ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEditMode
                ? "Ajustez la date, l'heure, la durée ou les notes"
                : 'Planifiez un rendez-vous pour un patient'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

            {isEditMode ? (
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
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
          {isEditMode ? (
            <button
              onClick={handleDelete}
              disabled={deleteAppointment.isPending}
              className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleteAppointment.isPending ? 'Suppression...' : 'Supprimer'}
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
              onClick={() => (isEditMode ? updateAppointment.mutate() : createAppointment.mutate())}
              disabled={createAppointment.isPending || updateAppointment.isPending}
              className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#0e6ba8' }}
            >
              <Save className="w-4 h-4" />
              {isEditMode
                ? updateAppointment.isPending
                  ? 'Enregistrement...'
                  : 'Enregistrer'
                : createAppointment.isPending
                ? 'Création...'
                : isNewPatient
                ? 'Créer le patient et le RDV'
                : 'Créer le rendez-vous'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
