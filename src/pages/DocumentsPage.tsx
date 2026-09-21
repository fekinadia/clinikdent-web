import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X, Printer, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  documentsApi,
  prescriptionsApi,
  patientsApi,
  cabinetApi,
  DocumentType,
} from '@/api/endpoints';
import type { Patient, Prescription, PatientDocument } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatMoney } from '@/lib/utils';

// Chantier Dentalis — page Documents (2026-09-21). Réunit dans une seule
// liste les ordonnances (table `prescriptions`, module Prescriptions déjà
// existant) et les 4 autres types de documents (table `documents`, module
// Documents) — comme la page équivalente chez Dentalis. Les ordonnances ne
// sont pas dupliquées : la création/édition détaillée (avec médicaments)
// reste possible depuis la fiche patient, cette page ajoute une création
// rapide en texte libre + la vue d'ensemble imprimable du cabinet.

type Kind = 'ordonnance' | DocumentType;

const TYPE_LABELS: Record<Kind, string> = {
  ordonnance: 'Ordonnance',
  certificat_medical: 'Certificat médical',
  lettre_liaison: 'Lettre de liaison',
  devis: 'Devis',
  note_honoraires: "Note d'honoraires",
};

const TYPE_BADGES: Record<Kind, string> = {
  ordonnance: 'badge-info',
  certificat_medical: 'badge-success',
  lettre_liaison: 'badge-warning',
  devis: 'badge-info',
  note_honoraires: 'badge-success',
};

interface UnifiedDoc {
  key: string;
  kind: Kind;
  dateEmission: string;
  patient?: { id: number; nom: string; prenom: string; numeroDossier?: string; dateNaissance?: string };
  contenu: string;
  items?: { nomMedicament: string; posologie?: string }[];
  montant?: number | null;
}

export function DocumentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'tous' | Kind>('tous');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docAVoir, setDocAVoir] = useState<UnifiedDoc | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const wantOrdonnances = typeFilter === 'tous' || typeFilter === 'ordonnance';
  const wantDocuments = typeFilter === 'tous' || typeFilter !== 'ordonnance';
  const docTypeFilter = wantDocuments && typeFilter !== 'tous' ? (typeFilter as DocumentType) : undefined;

  const { data: prescData, isLoading: prescLoading } = useQuery({
    queryKey: ['prescriptions-all', debouncedSearch],
    queryFn: () => prescriptionsApi.listAll({ search: debouncedSearch || undefined, limit: 100 }),
    enabled: wantOrdonnances,
  });

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents-all', docTypeFilter, debouncedSearch],
    queryFn: () => documentsApi.list({ type: docTypeFilter, search: debouncedSearch || undefined, limit: 100 }),
    enabled: wantDocuments,
  });

  const { data: cabinetMe } = useQuery({
    queryKey: ['cabinet-me'],
    queryFn: cabinetApi.me,
    staleTime: 5 * 60_000,
  });

  const isLoading = (wantOrdonnances && prescLoading) || (wantDocuments && docsLoading);

  const rows: UnifiedDoc[] = useMemo(() => {
    const out: UnifiedDoc[] = [];
    if (wantOrdonnances && prescData) {
      for (const p of prescData.items) {
        out.push({
          key: `ordonnance-${p.id}`,
          kind: 'ordonnance',
          dateEmission: p.dateEmission,
          patient: p.patient,
          contenu: p.texteLibre || '',
          items: p.items,
        });
      }
    }
    if (wantDocuments && docsData) {
      for (const d of docsData.items) {
        out.push({
          key: `${d.type}-${d.id}`,
          kind: d.type,
          dateEmission: d.dateEmission,
          patient: d.patient,
          contenu: d.contenu,
          montant: d.montant,
        });
      }
    }
    return out.sort((a, b) => new Date(b.dateEmission).getTime() - new Date(a.dateEmission).getTime());
  }, [prescData, docsData, wantOrdonnances, wantDocuments]);

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <FileText size={20} className="text-primary-500" />
            Documents
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordonnances, certificats, lettres de liaison, devis et notes d'honoraires du cabinet
          </p>
        </div>
        <button onClick={() => setIsDialogOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nouveau document
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              className="input pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'tous' | Kind)}
            className="input w-auto min-w-[200px]"
          >
            <option value="tous">Tous les types</option>
            <option value="ordonnance">Ordonnance</option>
            <option value="certificat_medical">Certificat médical</option>
            <option value="lettre_liaison">Lettre de liaison</option>
            <option value="devis">Devis</option>
            <option value="note_honoraires">Note d'honoraires</option>
          </select>
        </div>

        {isLoading ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">Aucun document pour l'instant</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Créer le premier document
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Aperçu</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(row.dateEmission)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {row.patient ? `${row.patient.prenom} ${row.patient.nom}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`badge ${TYPE_BADGES[row.kind]}`}>{TYPE_LABELS[row.kind]}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {row.contenu || (row.items && row.items.length > 0
                        ? row.items.map((i) => i.nomMedicament).join(', ')
                        : '—')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDocAVoir(row)}
                        className="text-slate-500 hover:text-primary-600 inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Printer className="w-4 h-4" />
                        Voir / Imprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDialogOpen && <NewDocumentDialog onClose={() => setIsDialogOpen(false)} />}
      {docAVoir && (
        <DocumentPrintModal doc={docAVoir} cabinetMe={cabinetMe} onClose={() => setDocAVoir(null)} />
      )}
    </>
  );
}

function DocumentPrintModal({
  doc,
  cabinetMe,
  onClose,
}: {
  doc: UnifiedDoc;
  cabinetMe?: { cabinet: { nom: string; adresse?: string | null; telephone?: string | null; logoUrl?: string | null }; medecin?: { nom: string; prenom: string; specialite?: string } };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 100);
    const handleAfterPrint = () => onClose();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Aperçu à l'écran (masqué à l'impression : voir .print-area dans index.css) */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:hidden">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{TYPE_LABELS[doc.kind]}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">{formatDate(doc.dateEmission)}</p>
          {doc.patient && (
            <p className="text-sm font-medium text-slate-900 mb-3">
              {doc.patient.prenom} {doc.patient.nom}
            </p>
          )}
          {doc.contenu && <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{doc.contenu}</p>}
          {doc.items && doc.items.length > 0 && (
            <ul className="space-y-1 mb-3">
              {doc.items.map((item, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-medium">{item.nomMedicament}</span>
                  {item.posologie ? ` — ${item.posologie}` : ''}
                </li>
              ))}
            </ul>
          )}
          {doc.montant != null && (
            <p className="text-sm font-semibold text-slate-900 mb-3">Montant : {formatMoney(doc.montant)} DT</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="btn-ghost">
              Fermer
            </button>
            <button onClick={() => window.print()} className="btn-primary">
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Contenu réellement imprimé (entête cabinet + document) */}
      <div className="print-area">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {cabinetMe?.cabinet.logoUrl && (
              <img src={cabinetMe.cabinet.logoUrl} alt="" className="h-12 w-12 object-contain" />
            )}
            <div>
              <p className="font-semibold text-slate-900">{cabinetMe?.cabinet.nom || ''}</p>
              {cabinetMe?.medecin && (
                <p className="text-xs text-slate-600">
                  Dr {cabinetMe.medecin.prenom} {cabinetMe.medecin.nom}
                  {cabinetMe.medecin.specialite ? ` — ${cabinetMe.medecin.specialite}` : ''}
                </p>
              )}
              {cabinetMe?.cabinet.adresse && <p className="text-xs text-slate-600">{cabinetMe.cabinet.adresse}</p>}
              {cabinetMe?.cabinet.telephone && <p className="text-xs text-slate-600">Tél : {cabinetMe.cabinet.telephone}</p>}
            </div>
          </div>
          <p className="text-sm text-slate-600">{formatDate(doc.dateEmission)}</p>
        </div>

        <h2 className="text-xl font-bold text-slate-900 text-center uppercase tracking-wide mb-8">
          {TYPE_LABELS[doc.kind]}
        </h2>

        {doc.patient && (
          <div className="mb-8 text-sm text-slate-700">
            <p className="font-medium">
              {doc.patient.prenom} {doc.patient.nom}
            </p>
            {doc.patient.numeroDossier && <p>Dossier n° {doc.patient.numeroDossier}</p>}
            {doc.patient.dateNaissance && <p>Né(e) le {formatDate(doc.patient.dateNaissance)}</p>}
          </div>
        )}

        {doc.contenu && <p className="text-sm text-slate-800 whitespace-pre-wrap mb-6">{doc.contenu}</p>}

        {doc.items && doc.items.length > 0 && (
          <ul className="space-y-2 mb-6">
            {doc.items.map((item, i) => (
              <li key={i} className="text-sm text-slate-800">
                <span className="font-medium">{item.nomMedicament}</span>
                {item.posologie ? ` — ${item.posologie}` : ''}
              </li>
            ))}
          </ul>
        )}

        {doc.montant != null && (
          <p className="text-sm font-semibold text-slate-900 mb-6">Montant : {formatMoney(doc.montant)} DT</p>
        )}

        <div className="mt-16 flex justify-end">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-12">Signature et cachet</p>
            <div className="w-48 border-t border-slate-400"></div>
          </div>
        </div>
      </div>
    </>
  );
}

function NewDocumentDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<Kind>('ordonnance');
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [contenu, setContenu] = useState('');
  const [montant, setMontant] = useState('');
  const [dateEmission, setDateEmission] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['patients-search-doc', debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, limit: 8 }),
    enabled: debouncedSearch.trim().length >= 2 && !selectedPatient,
  });

  const showMontant = type === 'devis' || type === 'note_honoraires';

  const createMutation = useMutation<Prescription | PatientDocument, unknown, void>({
    mutationFn: () => {
      if (!selectedPatient) throw new Error('Patient requis');
      if (type === 'ordonnance') {
        return prescriptionsApi.create({
          patientId: selectedPatient.id,
          texteLibre: contenu,
          dateEmission,
          items: [],
        });
      }
      return documentsApi.create({
        patientId: selectedPatient.id,
        type,
        contenu,
        montant: showMontant && montant.trim() ? Number(montant) : undefined,
        dateEmission,
      });
    },
    onSuccess: () => {
      toast.success('Document créé');
      qc.invalidateQueries({ queryKey: ['prescriptions-all'] });
      qc.invalidateQueries({ queryKey: ['documents-all'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du document');
    },
  });

  const canSubmit = !!selectedPatient && contenu.trim().length > 0 && !createMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Nouveau document</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Type de document</label>
            <select value={type} onChange={(e) => setType(e.target.value as Kind)} className="input">
              <option value="ordonnance">Ordonnance</option>
              <option value="certificat_medical">Certificat médical</option>
              <option value="lettre_liaison">Lettre de liaison</option>
              <option value="devis">Devis</option>
              <option value="note_honoraires">Note d'honoraires</option>
            </select>
          </div>

          <div>
            <label className="label">Patient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md bg-slate-50">
                <span className="text-sm font-medium text-slate-900">
                  {selectedPatient.prenom} {selectedPatient.nom}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
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
                  className="input pl-9"
                />
                {debouncedSearch.trim().length >= 2 && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {isSearching && <div className="px-4 py-3 text-sm text-slate-400">Recherche...</div>}
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
                          <span className="font-medium text-slate-900">
                            {p.prenom} {p.nom}
                          </span>
                          {p.gsm && <span className="text-slate-400 ml-2">{p.gsm}</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={dateEmission}
              onChange={(e) => setDateEmission(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Contenu</label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              className="input"
              rows={8}
              placeholder={
                type === 'ordonnance'
                  ? 'Ex : Doliprane 1g, 1cp x3/j pendant 5 jours...'
                  : 'Texte du document...'
              }
            />
          </div>

          {showMontant && (
            <div>
              <label className="label">Montant (DT, optionnel)</label>
              <input
                type="number"
                min={0}
                step="0.001"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button onClick={() => createMutation.mutate()} disabled={!canSubmit} className="btn-primary">
            {createMutation.isPending ? 'Création...' : 'Créer le document'}
          </button>
        </div>
      </div>
    </div>
  );
}
