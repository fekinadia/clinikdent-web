import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Image as ImageIcon, FileText, Trash2, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientImagesApi, PatientImage } from '../api/endpoints';
import { formatDate } from '../lib/utils';

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

  const { data: images = [], isLoading } = useQuery<PatientImage[]>({
    queryKey: ['patientImages', patientId],
    queryFn: () => patientImagesApi.list(patientId),
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
          className="px-5 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm hover:shadow"
          style={{ backgroundColor: '#0e6ba8' }}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <UploadImageDialog patientId={patientId} onClose={() => setIsDialogOpen(false)} />
      )}
    </div>
  );
}

function UploadImageDialog({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>('photo');
  const [titre, setTitre] = useState('');
  const [observation, setObservation] = useState('');
  const [datePrise, setDatePrise] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Aucun fichier sélectionné');
      return patientImagesApi.upload(patientId, file, { type, titre, observation, datePrise });
    },
    onSuccess: () => {
      toast.success('Pièce jointe ajoutée');
      qc.invalidateQueries({ queryKey: ['patientImages', patientId] });
      onClose();
    },
    onError: (err: any) => {
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
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          {file ? (
            <p className="text-sm font-medium text-slate-900">{file.name}</p>
          ) : (
            <p className="text-sm text-slate-500">
              Cliquer pour choisir un fichier
              <br />
              <span className="text-xs">JPEG, PNG, WEBP ou PDF — 15 Mo max</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
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
            disabled={!file || uploadMutation.isPending}
            className="px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50"
            style={{ backgroundColor: '#0e6ba8' }}
          >
            {uploadMutation.isPending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
