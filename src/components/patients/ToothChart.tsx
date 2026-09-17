import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle2,
  AlertTriangle,
  Droplet,
  Crown,
  XCircle,
  MousePointerClick,
  ClipboardList,
  Info,
} from 'lucide-react';
import { treatmentsApi } from '@/api/endpoints';
import type { ToothEtat } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

// ===== Numérotation FDI =====
const PERM_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERM_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const PRIM_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const PRIM_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const ALL_PERM = [...PERM_UPPER, ...PERM_LOWER];
const ALL_PRIM = [...PRIM_UPPER, ...PRIM_LOWER];
const ALL_TEETH = [...ALL_PERM, ...ALL_PRIM];

const isPrimary = (n: number) => n >= 51;

// Secteurs FDI (dents permanentes) — utilisés par le panneau « Contrôles »
const SEXTANTS: { label: string; teeth: number[] }[] = [
  { label: 'Secteur 1', teeth: [18, 17, 16, 15, 14] },
  { label: 'Secteur 2', teeth: [13, 12, 11, 21, 22, 23] },
  { label: 'Secteur 3', teeth: [24, 25, 26, 27, 28] },
  { label: 'Secteur 4', teeth: [38, 37, 36, 35, 34] },
  { label: 'Secteur 5', teeth: [33, 32, 31, 41, 42, 43] },
  { label: 'Secteur 6', teeth: [44, 45, 46, 47, 48] },
];

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

// Barre d'action rapide : les 5 états les plus courants, en icônes
const QUICK_ETATS: { value: ToothEtat; label: string; Icon: typeof CheckCircle2 }[] = [
  { value: 'saine', label: 'Saine', Icon: CheckCircle2 },
  { value: 'carie', label: 'Carie', Icon: AlertTriangle },
  { value: 'obturation', label: 'Obturation', Icon: Droplet },
  { value: 'couronne', label: 'Couronne', Icon: Crown },
  { value: 'extraction', label: 'Extraction', Icon: XCircle },
];

type ToothUpdate = { dentNumero: number; etat: ToothEtat; notes?: string };
const withEtat = (teeth: number[], etat: ToothEtat, notes?: string): ToothUpdate[] =>
  teeth.map((n) => ({ dentNumero: n, etat, notes }));

interface Props {
  patientId: number;
}

export function ToothChart({ patientId }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingEtat, setPendingEtat] = useState<ToothEtat>('saine');
  const [confirmingPreset, setConfirmingPreset] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const { data: states, isLoading } = useQuery({
    queryKey: ['tooth-chart', patientId],
    queryFn: () => treatmentsApi.toothChart(patientId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tooth-chart', patientId] });

  const singleMutation = useMutation({
    mutationFn: ({ dentNumero, etat, notes }: ToothUpdate) =>
      treatmentsApi.updateTooth(patientId, dentNumero, etat, notes),
    onSuccess: () => {
      invalidate();
      toast.success('Dent mise à jour');
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const bulkMutation = useMutation({
    mutationFn: async (updates: ToothUpdate[]) => {
      await Promise.all(
        updates.map((u) => treatmentsApi.updateTooth(patientId, u.dentNumero, u.etat, u.notes)),
      );
      return updates.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast.success(`${count} dent(s) mise(s) à jour`);
    },
    onError: () => toast.error('Erreur lors de la mise à jour groupée'),
  });

  const getState = (n: number) => states?.find((s) => s.dentNumero === n);
  const getEtat = (n: number): ToothEtat => (getState(n)?.etat as ToothEtat) || 'saine';
  const getColor = (etat: ToothEtat) => ETATS.find((e) => e.value === etat)?.color || '#cbd5e1';

  const soleSelected = selected.size === 1 ? Array.from(selected)[0] : null;

  useEffect(() => {
    if (soleSelected != null) {
      setNotesDraft(getState(soleSelected)?.notes || '');
    }
    // On ne resynchronise le brouillon que lorsqu'on change de dent sélectionnée,
    // pas à chaque refetch (pour ne pas écraser une note en cours de frappe).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleSelected]);

  const toggleTooth = (n: number, e: ReactMouseEvent) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.metaKey || e.ctrlKey) {
        if (next.has(n)) next.delete(n);
        else next.add(n);
      } else {
        next.clear();
        next.add(n);
      }
      return next;
    });
  };

  const selectSet = (teeth: number[]) => setSelected(new Set(teeth));
  const clearSelection = () => setSelected(new Set());

  const applyEtatToSelection = (etat: ToothEtat) => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins une dent');
      return;
    }
    bulkMutation.mutate(withEtat(Array.from(selected), etat));
  };

  const runPreset = (key: string, action: () => void) => {
    if (confirmingPreset !== key) {
      setConfirmingPreset(key);
      setTimeout(() => setConfirmingPreset((c) => (c === key ? null : c)), 4000);
      return;
    }
    setConfirmingPreset(null);
    action();
  };

  // Ces 4 préréglages reproduisent l'esprit du panneau « Statuts » observé sur
  // la démo Dentalis. Leur logique exacte (quelles dents deviennent quoi)
  // n'étant pas documentée côté Dentalis, il s'agit d'une approximation
  // clinique raisonnable, ajustable si elle ne correspond pas à l'usage réel.
  const presets: { key: string; label: string; action: () => void }[] = [
    {
      key: 'reset',
      label: 'Réinitialiser la bouche',
      action: () => bulkMutation.mutate(withEtat(ALL_TEETH, 'saine', '')),
    },
    {
      key: 'primaire',
      label: 'Denture primaire',
      action: () =>
        bulkMutation.mutate([...withEtat(ALL_PRIM, 'saine'), ...withEtat(ALL_PERM, 'absente')]),
    },
    {
      key: 'mixte',
      label: 'Denture mixte',
      action: () => {
        const permErupted = [11, 12, 21, 22, 31, 32, 41, 42, 16, 26, 36, 46];
        const primGone = [51, 52, 61, 62, 71, 72, 81, 82];
        const primRemaining = ALL_PRIM.filter((n) => !primGone.includes(n));
        const permRemaining = ALL_PERM.filter((n) => !permErupted.includes(n));
        bulkMutation.mutate([
          ...withEtat(permErupted, 'saine'),
          ...withEtat(primGone, 'absente'),
          ...withEtat(primRemaining, 'saine'),
          ...withEtat(permRemaining, 'absente'),
        ]);
      },
    },
    {
      key: 'edente',
      label: 'Édenté',
      action: () => bulkMutation.mutate(withEtat(ALL_TEETH, 'absente')),
    },
  ];

  const controlActions: { label: string; action: () => void }[] = [
    { label: 'Tout sélectionner', action: () => selectSet(ALL_TEETH) },
    { label: 'Aucune sélection', action: clearSelection },
    { label: 'Arcade supérieure', action: () => selectSet([...PERM_UPPER, ...PRIM_UPPER]) },
    { label: 'Arcade inférieure', action: () => selectSet([...PERM_LOWER, ...PRIM_LOWER]) },
    { label: 'Dents permanentes', action: () => selectSet(ALL_PERM) },
    { label: 'Dents de lait', action: () => selectSet(ALL_PRIM) },
    ...SEXTANTS.map((s) => ({ label: s.label, action: () => selectSet(s.teeth) })),
  ];

  if (isLoading) return <div className="py-12"><Spinner /></div>;

  return (
    <div>
      {/* Barre d'action rapide */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-1">
          Action rapide
        </span>
        {QUICK_ETATS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => applyEtatToSelection(value)}
            disabled={bulkMutation.isPending}
            title={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-white hover:border-accent-400 hover:text-accent-600 transition-colors disabled:opacity-50"
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ETATS.map((e) => (
          <div
            key={e.value}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${e.color}1a`, color: e.color }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
            {e.label}
          </div>
        ))}
      </div>

      {/* Schéma */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col gap-2 items-center overflow-x-auto">
        <div className="text-xs text-center text-slate-500 mb-1 uppercase tracking-wider font-semibold">
          Maxillaire (haut)
        </div>
        <div className="flex gap-1">
          {PERM_UPPER.map((n) => (
            <Tooth
              key={n}
              num={n}
              etat={getEtat(n)}
              color={getColor(getEtat(n))}
              isUpper
              size="lg"
              isSelected={selected.has(n)}
              onClick={(e) => toggleTooth(n, e)}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {PRIM_UPPER.map((n) => (
            <Tooth
              key={n}
              num={n}
              etat={getEtat(n)}
              color={getColor(getEtat(n))}
              isUpper
              size="sm"
              isSelected={selected.has(n)}
              onClick={(e) => toggleTooth(n, e)}
            />
          ))}
        </div>

        <div className="w-full max-w-xs border-t border-dashed border-slate-300 my-2" />

        <div className="flex gap-1">
          {PRIM_LOWER.map((n) => (
            <Tooth
              key={n}
              num={n}
              etat={getEtat(n)}
              color={getColor(getEtat(n))}
              isUpper={false}
              size="sm"
              isSelected={selected.has(n)}
              onClick={(e) => toggleTooth(n, e)}
            />
          ))}
        </div>
        <div className="flex gap-1">
          {PERM_LOWER.map((n) => (
            <Tooth
              key={n}
              num={n}
              etat={getEtat(n)}
              color={getColor(getEtat(n))}
              isUpper={false}
              size="lg"
              isSelected={selected.has(n)}
              onClick={(e) => toggleTooth(n, e)}
            />
          ))}
        </div>
        <div className="text-xs text-center text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          Mandibule (bas)
        </div>
        <div className="text-[11px] text-center text-slate-400 mt-1">
          Clic : sélectionner une dent · Ctrl/Cmd + clic : sélection multiple
        </div>
      </div>

      {/* Contrôles / Statuts / Détails de la dent */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card !rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick size={16} className="text-accent-500" />
            <h3 className="font-display text-sm font-semibold">Contrôles</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {controlActions.map((c) => (
              <button
                key={c.label}
                onClick={c.action}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200 bg-white hover:border-accent-400 hover:text-accent-600 transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              {selected.size} dent(s) sélectionnée(s)
            </div>
          )}
        </div>

        <div className="card !rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-accent-500" />
            <h3 className="font-display text-sm font-semibold">Statuts</h3>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => runPreset(p.key, p.action)}
                disabled={bulkMutation.isPending}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors disabled:opacity-50 ${
                  confirmingPreset === p.key
                    ? 'border-rose-400 bg-rose-50 text-rose-600'
                    : 'border-slate-200 bg-white hover:border-accent-400 hover:text-accent-600'
                }`}
              >
                {confirmingPreset === p.key ? 'Confirmer ?' : p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Ajouter :
            </label>
            <select
              className="input !py-1 !text-xs flex-1"
              value={pendingEtat}
              onChange={(e) => setPendingEtat(e.target.value as ToothEtat)}
            >
              {ETATS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => applyEtatToSelection(pendingEtat)}
              disabled={selected.size === 0 || bulkMutation.isPending}
              className="btn-primary !rounded-full !px-3 !py-1 text-xs disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>

        <div className="card !rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-accent-500" />
            <h3 className="font-display text-sm font-semibold">Détails de la dent</h3>
          </div>

          {selected.size === 0 && (
            <div className="text-xs text-slate-400 italic">
              Sélectionnez une ou plusieurs dents dans le schéma pour voir les détails.
            </div>
          )}

          {selected.size > 1 && (
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {selected.size} dents sélectionnées.
              </span>{' '}
              Utilisez le panneau « Statuts » ci-contre pour leur appliquer un état en une fois.
            </div>
          )}

          {soleSelected != null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {isPrimary(soleSelected) ? 'Dent de lait' : 'Dent permanente'}
                  </div>
                  <h4 className="font-display text-base font-semibold">
                    Dent N° {soleSelected}
                  </h4>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    background: `${getColor(getEtat(soleSelected))}1a`,
                    color: getColor(getEtat(soleSelected)),
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: getColor(getEtat(soleSelected)) }}
                  />
                  {ETATS.find((e) => e.value === getEtat(soleSelected))?.label}
                </span>
              </div>

              {getState(soleSelected)?.dateModif && (
                <div className="text-[11px] text-slate-400">
                  Dernière modification :{' '}
                  {format(new Date(getState(soleSelected)!.dateModif), "d MMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </div>
              )}

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Observation sur cette dent..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() =>
                    singleMutation.mutate({
                      dentNumero: soleSelected,
                      etat: getEtat(soleSelected),
                      notes: notesDraft,
                    })
                  }
                  disabled={singleMutation.isPending}
                  className="btn-primary !rounded-full !px-4 !py-1.5 text-xs disabled:opacity-50"
                >
                  Enregistrer la note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tooth({
  num,
  etat,
  color,
  isUpper,
  isSelected,
  size,
  onClick,
}: {
  num: number;
  etat: ToothEtat;
  color: string;
  isUpper: boolean;
  isSelected: boolean;
  size: 'lg' | 'sm';
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const w = size === 'lg' ? 28 : 20;
  const h = size === 'lg' ? 40 : 29;
  const badgeSize = size === 'lg' ? 'w-4 h-4 text-[10px]' : 'w-3.5 h-3.5 text-[8px]';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 cursor-pointer transition-transform hover:-translate-y-1 ${
        isSelected ? 'scale-110' : ''
      }`}
    >
      {isUpper && (
        <div
          className={`${badgeSize} rounded-full flex items-center justify-center font-semibold ${
            isSelected ? 'bg-accent-500 text-white' : 'text-slate-400'
          }`}
        >
          {num}
        </div>
      )}
      <svg width={w} height={h} viewBox="0 0 28 40">
        <path
          d="M14 2 C20 2 24 6 24 14 C24 22 22 28 20 34 C19 37 17 38 14 38 C11 38 9 37 8 34 C6 28 4 22 4 14 C4 6 8 2 14 2 Z"
          fill={color}
          stroke={isSelected ? '#14b8a6' : '#0b1f33'}
          strokeWidth={isSelected ? 2.5 : 1}
          opacity="0.85"
        />
      </svg>
      {!isUpper && (
        <div
          className={`${badgeSize} rounded-full flex items-center justify-center font-semibold ${
            isSelected ? 'bg-accent-500 text-white' : 'text-slate-400'
          }`}
        >
          {num}
        </div>
      )}
    </button>
  );
}
