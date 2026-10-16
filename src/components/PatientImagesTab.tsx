import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Image as ImageIcon, FileText, Trash2, X, Upload, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { patientImagesApi, PatientImage } from '../api/endpoints';
import { api } from '../api/client';
import { formatDate } from '../lib/utils';
import { compressImage } from '../lib/compressImage';

// Pièces jointes rattachées à une consultation (2026-10-16) : chaque fichier
// peut être lié à une séance de soins (`treatmentId`), affiché ensuite sous
// cette consultation dans l'onglet Soins.
export type PatientImageRow = PatientImage & { treatmentId?: number | null };

export interface ConsultationOption {
  id: number;
  date: string; // AAAA-MM-JJ
  label: string; // « 01/10/26 · Détartrage + … »
}

interface TreatmentLite {
  id: number;
  dateSoin: string;
  acts: { libelle: string }[];
}

export function useConsultations(patientId: number): ConsultationOption[] {
  // Même clé que l'onglet Soins : les données sont partagées en cache.
  const { data: treatments = [] } = useQuery<TreatmentLite[]>({
    queryKey: ['treatments', patientId],
    queryFn: async () => (await api.get(`/patients/${patientId}/treatments`)).data,
  });
  return treatments.map((t) => {
    const actes = t.acts.map((a) => a.libelle).join(' + ');
    return {
      id: t.id,
      date: t.dateSoin.slice(0, 10),
      label: `${format(new Date(t.dateSoin), 'dd/MM/yy')}${actes ? ` · ${actes}` : ''}`,
    };
  });
}

async function envoyerPieceJointe(
  patientId: number,
  file: File,
  data: { type: string; titre?: string; observation?: string; datePrise?: string; treatmentId?: number | null },
  onProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', data.type);
  if (data.titre) formData.append('titre', data.titre);
  if (data.observation) formData.append('observation', data.observation);
  if (data.datePrise) formData.append('datePrise', data.datePrise);
  if (data.treatmentId) formData.append('treatmentId', String(data.treatmentId));
  await api.post(`/patients/${patientId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
}

interface PatientImagesTabProps {
  patientId: number;
}

const TYPE_LABELS: Record<string, string> = {
  photo: 'Photo',
  radio: 'Radio',
  panoramique: 'Panoramique',
  scanner: 'Scanner',
  document: 'Document',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS);

export function PatientImagesTab({ patientId }: PatientImagesTabProps) {
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: images = [], isLoading } = useQuery<PatientImageRow[]>({
    queryKey: ['patientImages', patientId],
    queryFn: () => patientImagesApi.list(patientId),
  });
  const consultations = useConsultations(patientId);
  const consultationById = new Map(consultations.map((c) => [c.id, c]));

  const linkMutation = useMutation({
    mutationFn: ({ imageId, treatmentId }: { imageId: number; treatmentId: number | null }) =>
      api.patch(`/patients/${patientId}/images/${imageId}`, { treatmentId }),
    onSuccess: (_res, { treatmentId }) => {
      toast.success(treatmentId ? 'Rattaché à la consultation' : 'Détaché de la consultation');
      qc.invalidateQueries({ queryKey: ['patientImages', patientId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Impossible de modifier le rattachement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => patientImagesApi.delete(patientId, imageId),
    onSuccess: () => {
      toast.success('Pièce jointe supprimée');
      qc.invalidateQueries({ queryKey: ['patientImages', patientId] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Photos, radios &amp; documents</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {images.length === 0
              ? 'Aucune pièce jointe'
              : `${images.length} fichier${images.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="btn-primary !rounded-full !px-5 !py-2.5 shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" />
          Ajouter une photo/radio
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3">Chargement...</p>
        </div>
      )}

      {!isLoading && images.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Aucune photo, radio ou document pour ce patient</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter le premier fichier
          </button>
        </div>
      )}

      {!isLoading && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition"
            >
              <a
                href={img.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center aspect-square bg-slate-100"
              >
                {img.mimeType?.startsWith('image/') && img.url ? (
                  <img
                    src={img.url}
                    alt={img.titre || TYPE_LABELS[img.type] || img.type}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-10 h-10 text-slate-400" />
                )}
              </a>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="badge-info text-xs">{TYPE_LABELS[img.type] || img.type}</span>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer cette pièce jointe ?')) {
                        deleteMutation.mutate(img.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {img.titre && (
                  <div className="text-sm font-medium text-slate-900 mt-1.5 truncate">{img.titre}</div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {formatDate(img.datePrise || img.createdAt)}
                </div>
                {consultations.length > 0 && (
                  <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Stethoscope size={12} className="flex-shrink-0 text-slate-400" />
                    <select
                      value={img.treatmentId ?? ''}
                      onChange={(e) =>
                        linkMutation.mutate({
                          imageId: img.id,
                          treatmentId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      disabled={linkMutation.isPending}
                      className={`w-full min-w-0 truncate rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs ${
                        img.treatmentId ? 'text-primary-700' : 'text-slate-400'
                      }`}
                      title="Consultation liée"
                    >
                      <option value="">Aucune consultation</option>
                      {consultations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                      {img.treatmentId && !consultationById.has(img.treatmentId) && (
                        <option value={img.treatmentId}>Consultation liée</option>
                      )}
                    </select>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <UploadImageDialog
          patientId={patientId}
          consultations={consultations}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}

export function UploadImageDialog({
  patientId,
  onClose,
  consultations = [],
  defaultTreatmentId,
  defaultDate,
}: {
  patientId: number;
  onClose: () => void;
  consultations?: ConsultationOption[];
  defaultTreatmentId?: number;
  defaultDate?: string;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<string>('photo');
  const [titre, setTitre] = useState('');
  const [observation, setObservation] = useState('');
  const [datePrise, setDatePrise] = useState(defaultDate || '');
  const [treatmentId, setTreatmentId] = useState<number | null>(defaultTreatmentId ?? null);
  // Progression affichée sur le bouton (2026-09-27) : l'envoi depuis un
  // téléphone donnait l'impression d'un écran figé sur « Envoi... ».
  const [progress, setProgress] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error('Aucun fichier sélectionné');
      // Envoi un par un : sur mobile la bande passante est partagée de toute
      // façon, et ça permet d'afficher une progression lisible.
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        const prefix = files.length > 1 ? `${i + 1}/${files.length} · ` : '';
        try {
          setProgress(`${prefix}Préparation...`);
          const toSend = await compressImage(files[i], type);
          setProgress(`${prefix}Envoi 0 %`);
          await envoyerPieceJointe(
            patientId,
            toSend,
            { type, titre, observation, datePrise, treatmentId },
            (p) => setProgress(`${prefix}Envoi ${p} %`),
          );
        } catch {
          failed++;
        }
      }
      setProgress(null);
      if (failed === files.length) throw new Error("Échec de l'envoi");
      return { total: files.length, failed };
    },
    onSuccess: ({ total, failed }: { total: number; failed: number }) => {
      if (failed === 0) {
        toast.success(total > 1 ? `${total} fichiers ajoutés` : 'Pièce jointe ajoutée');
      } else {
        toast.error(`${total - failed}/${total} fichier(s) envoyé(s), ${failed} échec(s)`);
      }
      qc.invalidateQueries({ queryKey: ['patientImages', patientId] });
      onClose();
    },
    onError: (err: any) => {
      setProgress(null);
      toast.error(err?.response?.data?.message || "Erreur lors de l'envoi du fichier");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Ajouter une photo/radio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary-300 transition mb-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          {files.length > 0 ? (
            <p className="text-sm font-medium text-slate-900">
              {files.length > 1 ? `${files.length} fichiers sélectionnés` : files[0].name}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Cliquer pour choisir un ou plusieurs fichiers
              <br />
              <span className="text-xs">Tous types de fichiers acceptés — 15 Mo max par fichier</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          {consultations.length > 0 && (
            <div>
              <label className="label">Consultation (optionnel)</label>
              <select
                value={treatmentId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setTreatmentId(id);
                  // La date du fichier suit celle de la consultation, si elle
                  // n'a pas déjà été saisie.
                  const c = consultations.find((x) => x.id === id);
                  if (c && !datePrise) setDatePrise(c.date);
                }}
                className="input"
              >
                <option value="">Aucune consultation</option>
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Titre (optionnel)</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="input"
              placeholder="Ex : Radio panoramique 2024"
            />
          </div>
          <div>
            <label className="label">Date (optionnel)</label>
            <input
              type="date"
              value={datePrise}
              onChange={(e) => setDatePrise(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Observation (optionnel)</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="input"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={files.length === 0 || uploadMutation.isPending}
            className="btn-primary !rounded-full !px-5 !py-2.5"
          >
            {uploadMutation.isPending
              ? progress || 'Envoi...'
              : files.length > 1
                ? `Envoyer (${files.length})`
                : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
