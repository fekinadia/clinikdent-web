import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsApi, patientsApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';
import type { Patient } from '@/types';

interface NewAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
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

export function NewAppointmentDialog({ isOpen, onClose }: NewAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [heure, setHeure] = useState('09:00');
  const [duree, setDuree] = useState(30);
  const [observation, setObservation] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, limit: 8 }),
    enabled: debouncedSearch.trim().length >= 2 && !selectedPatient,
  });

  const handleClose = () => {
    setPatientSearch('');
    setDebouncedSearch('');
    setSelectedPatient(null);
    setDate(new Date().toISOString().split('T')[0]);
    setHeure('09:00');
    setDuree(30);
    setObservation('');
    onClose();
  };

  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error('Sélectionnez un patient');
      const dateDebut = new Date(`${date}T${heure}:00`);
      const dateFin = new Date(dateDebut.getTime() + duree * 60000);
      return appointmentsApi.create({
        patientId: selectedPatient.id,
        medecinId: user?.id,
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        observation: observation || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Rendez-vous créé');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      handleClose();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || "Erreur lors de la création du rendez-vous";
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Fraunces, serif' }}>
              Nouveau rendez-vous
            </h2>
            <p className="text-sm text-slate-500 mt-1">Planifiez un rendez-vous pour un patient</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition" aria-label="Fermer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Patient
            </label>
            {selectedPatient ? (
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
                      <div className="px-4 py-3 text-sm text-slate-400">Aucun patient trouvé</div>
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
              {DURATIONS.map((d) => (
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

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
          >
            Annuler
          </button>
          <button
            onClick={() => createAppointment.mutate()}
            disabled={createAppointment.isPending}
            className="px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            <Save className="w-4 h-4" />
            {createAppointment.isPending ? 'Création...' : 'Créer le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}
