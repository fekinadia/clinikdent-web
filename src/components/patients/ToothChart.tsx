import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { treatmentsApi } from '@/api/endpoints';
import type { ToothEtat } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const ETATS: { value: ToothEtat; label: string; color: string }[] = [
  { value: 'saine', label: 'Saine', color: '#cbd5e1' },
  { value: 'carie', label: 'Carie', color: '#f59e0b' },
  { value: 'obturation', label: 'Obturation', color: '#3b82f6' },
  { value: 'couronne', label: 'Couronne', color: '#10b981' },
  { value: 'bridge', label: 'Bridge', color: '#8b5cf6' },
  { value: 'implant', label: 'Implant', color: '#ec4899' },
  { value: 'extraction', label: 'Extraction', color: '#ef4444' },
  { value: 'absente', label: 'Absente', color: '#475569' },
  { value: 'endo', label: 'Endo', color: '#06b6d4' },
  { value: 'a_traiter', label: 'À traiter', color: '#fbbf24' },
];

interface Props {
  patientId: number;
}

export function ToothChart({ patientId }: Props) {
  const qc = useQueryClient();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const { data: states, isLoading } = useQuery({
    queryKey: ['tooth-chart', patientId],
    queryFn: () => treatmentsApi.toothChart(patientId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ dentNumero, etat }: { dentNumero: number; etat: ToothEtat }) =>
      treatmentsApi.updateTooth(patientId, dentNumero, etat),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tooth-chart', patientId] });
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const getEtat = (dentNumero: number): ToothEtat => {
    return (states?.find((s) => s.dentNumero === dentNumero)?.etat as ToothEtat) || 'saine';
  };

  const getColor = (etat: ToothEtat) =>
    ETATS.find((e) => e.value === etat)?.color || '#cbd5e1';

  const handleSetEtat = (etat: ToothEtat) => {
    if (selectedTooth) {
      updateMutation.mutate({ dentNumero: selectedTooth, etat });
    }
  };

  if (isLoading) return <div className="py-12"><Spinner /></div>;

  return (
    <div>
      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs mb-6">
        {ETATS.map((e) => (
          <div key={e.value} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: e.color }} />
            {e.label}
          </div>
        ))}
      </div>

      {/* Schéma */}
      <div className="bg-slate-50 p-6 rounded-lg flex flex-col gap-6 items-center">
        {/* Maxillaire */}
        <div>
          <div className="text-xs text-center text-slate-500 mb-2 uppercase tracking-wider">
            Maxillaire (haut)
          </div>
          <div className="flex gap-1">
            {UPPER_TEETH.map((n) => (
              <Tooth
                key={n}
                num={n}
                etat={getEtat(n)}
                color={getColor(getEtat(n))}
                isUpper
                isSelected={selectedTooth === n}
                onClick={() => setSelectedTooth(n)}
              />
            ))}
          </div>
        </div>

        {/* Mandibule */}
        <div>
          <div className="flex gap-1">
            {LOWER_TEETH.map((n) => (
              <Tooth
                key={n}
                num={n}
                etat={getEtat(n)}
                color={getColor(getEtat(n))}
                isUpper={false}
                isSelected={selectedTooth === n}
                onClick={() => setSelectedTooth(n)}
              />
            ))}
          </div>
          <div className="text-xs text-center text-slate-500 mt-2 uppercase tracking-wider">
            Mandibule (bas)
          </div>
        </div>
      </div>

      {/* Panel d'édition */}
      {selectedTooth && (
        <div className="mt-6 card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Dent sélectionnée
              </span>
              <h3 className="font-display text-lg font-semibold">
                Dent N° {selectedTooth}
              </h3>
            </div>
            <button
              onClick={() => setSelectedTooth(null)}
              className="text-slate-400 hover:text-slate-700 text-sm"
            >
              Désélectionner
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {ETATS.map((e) => (
              <button
                key={e.value}
                onClick={() => handleSetEtat(e.value)}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-sm"
              >
                <div className="w-3 h-3 rounded" style={{ background: e.color }} />
                {e.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tooth({
  num, etat, color, isUpper, isSelected, onClick,
}: {
  num: number; etat: ToothEtat; color: string;
  isUpper: boolean; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 cursor-pointer transition-transform hover:-translate-y-1 ${
        isSelected ? 'scale-110' : ''
      }`}
    >
      {isUpper && (
        <div className="text-[10px] text-slate-400">{num}</div>
      )}
      <svg width="28" height="40" viewBox="0 0 28 40">
        <path
          d="M14 2 C20 2 24 6 24 14 C24 22 22 28 20 34 C19 37 17 38 14 38 C11 38 9 37 8 34 C6 28 4 22 4 14 C4 6 8 2 14 2 Z"
          fill={color}
          stroke={isSelected ? '#0e6ba8' : '#0b1f33'}
          strokeWidth={isSelected ? 2.5 : 1}
          opacity="0.85"
        />
      </svg>
      {!isUpper && (
        <div className="text-[10px] text-slate-400">{num}</div>
      )}
    </button>
  );
}
