import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Receipt, Plus, Pencil, Trash2, Download, X, Save } from 'lucide-react';
import { expensesApi, Expense, ExpensesOverview } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney, formatDateShort } from '@/lib/utils';

const PERIODES = [
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
];

const CATEGORIES = [
  'Loyer',
  'Salaires',
  'Fournitures médicales',
  'Matériel',
  'Électricité / Eau',
  'Marketing',
  'Assurance',
  'Autre',
];

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(';'),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExpenseFormState {
  libelle: string;
  montant: string;
  dateDepense: string;
  categorie: string;
  fournisseur: string;
  justificatif: string;
}

function emptyForm(): ExpenseFormState {
  return {
    libelle: '',
    montant: '',
    dateDepense: new Date().toISOString().split('T')[0],
    categorie: CATEGORIES[0],
    fournisseur: '',
    justificatif: '',
  };
}

function ExpenseDialog({
  isOpen,
  onClose,
  expense,
}: {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
}) {
  const qc = useQueryClient();
  const isEditMode = !!expense;
  const [form, setForm] = useState<ExpenseFormState>(emptyForm());

  // Recharge le formulaire à chaque ouverture (le dialogue reste monté en
  // permanence dans la page, contrôlé par `isOpen` — sans cet effet, passer
  // d'une dépense à modifier à une autre, ou d'une modification à un ajout,
  // garderait les anciennes valeurs affichées).
  useEffect(() => {
    if (isOpen) {
      setForm(
        expense
          ? {
              libelle: expense.libelle,
              montant: String(expense.montant),
              dateDepense: expense.dateDepense.split('T')[0],
              categorie: expense.categorie || CATEGORIES[0],
              fournisseur: expense.fournisseur || '',
              justificatif: expense.justificatif || '',
            }
          : emptyForm(),
      );
    }
  }, [isOpen, expense]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        libelle: form.libelle.trim(),
        montant: Number(form.montant),
        dateDepense: form.dateDepense,
        categorie: form.categorie || undefined,
        fournisseur: form.fournisseur.trim() || undefined,
        justificatif: form.justificatif.trim() || undefined,
      };
      return isEditMode ? expensesApi.update(expense!.id, payload) : expensesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Dépense modifiée' : 'Dépense enregistrée');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-overview'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erreur lors de l'enregistrement");
    },
  });

  if (!isOpen) return null;

  const isValid = form.libelle.trim().length > 0 && Number(form.montant) > 0 && !!form.dateDepense;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-display font-semibold text-slate-900">
            {isEditMode ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">Libellé</label>
            <input
              type="text"
              className="input"
              value={form.libelle}
              onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
              placeholder="Ex : Loyer du cabinet - septembre"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Montant (DT)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="input"
                value={form.montant}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                placeholder="0.000"
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.dateDepense}
                onChange={(e) => setForm((f) => ({ ...f, dateDepense: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Catégorie</label>
            <select
              className="input"
              value={form.categorie}
              onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Fournisseur (optionnel)</label>
            <input
              type="text"
              className="input"
              value={form.fournisseur}
              onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))}
              placeholder="Ex : STEG, Pharmacie XYZ..."
            />
          </div>

          <div>
            <label className="label">Justificatif (optionnel)</label>
            <input
              type="text"
              className="input"
              value={form.justificatif}
              onChange={(e) => setForm((f) => ({ ...f, justificatif: e.target.value }))}
              placeholder="Ex : n° de facture, ou une note"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary"
          >
            <Save size={16} />
            {isEditMode ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const [months, setMonths] = useState(12);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const qc = useQueryClient();

  const { data: overview, isLoading: loadingOverview } = useQuery<ExpensesOverview>({
    queryKey: ['expenses-overview', months],
    queryFn: () => expensesApi.getOverview(months),
  });

  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses', from, to, categorieFilter],
    queryFn: () =>
      expensesApi.list({
        from: from || undefined,
        to: to || undefined,
        categorie: categorieFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      toast.success('Dépense supprimée');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-overview'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Impossible de supprimer cette dépense');
    },
  });

  function handleAdd() {
    setEditingExpense(null);
    setDialogOpen(true);
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setDialogOpen(true);
  }

  function handleDelete(expense: Expense) {
    if (
      confirm(
        `Supprimer la dépense "${expense.libelle}" (${formatMoney(expense.montant)} DT) ? Cette action est irréversible.`,
      )
    ) {
      deleteMutation.mutate(expense.id);
    }
  }

  function handleExportCsv() {
    if (!expenses || expenses.length === 0) return;
    const rows = [
      ['Date', 'Catégorie', 'Libellé', 'Fournisseur', 'Montant (DT)', 'Justificatif'],
      ...expenses.map((e) => [
        formatDateShort(e.dateDepense),
        e.categorie || '',
        e.libelle,
        e.fournisseur || '',
        String(e.montant),
        e.justificatif || '',
      ]),
    ];
    downloadCsv(`depenses_${from || 'debut'}_${to || 'auj'}.csv`, rows);
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold flex items-center gap-2">
            <Receipt size={20} className="text-primary-500" />
            Dépenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Suivi des charges et dépenses du cabinet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {PERIODES.map((p) => (
              <button
                key={p.value}
                onClick={() => setMonths(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  months === p.value ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={handleAdd} className="btn-primary">
            <Plus size={16} />
            Nouvelle dépense
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loadingOverview ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Total dépenses ({months} mois)
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50">
                  <Receipt size={18} className="text-rose-600" />
                </div>
              </div>
              <div className="text-2xl font-display font-semibold text-slate-900">
                {formatMoney(overview?.total || 0)} DT
              </div>
            </div>

            <div className="card p-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Répartition par catégorie
              </span>
              {!overview || overview.parCategorie.length === 0 ? (
                <p className="text-sm text-slate-400 mt-3">Aucune dépense sur la période.</p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {overview.parCategorie.map((c) => (
                    <div key={c.categorie} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{c.categorie}</span>
                      <span className="font-medium text-slate-900">{formatMoney(c.total)} DT</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Du</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Au</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)}>
              <option value="">Toutes</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={!expenses || expenses.length === 0}
            className="btn-primary ml-auto"
          >
            <Download size={16} />
            Exporter CSV
          </button>
        </div>

        <div className="card">
          {loadingExpenses ? (
            <div className="p-12">
              <Spinner />
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt size={48} />}
              title="Aucune dépense enregistrée"
              description="Ajoutez la première dépense du cabinet avec le bouton ci-dessus."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Catégorie</th>
                    <th className="px-4 py-3 font-medium">Libellé</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium text-right">Montant</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateShort(e.dateDepense)}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-neutral">{e.categorie || 'Autre'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {e.libelle}
                        {e.justificatif && <div className="text-xs text-slate-400">{e.justificatif}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.fournisseur || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatMoney(e.montant)} DT
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(e)} className="btn-ghost !px-2 !py-1.5">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(e)}
                            disabled={deleteMutation.isPending}
                            className="btn-ghost !px-2 !py-1.5 text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ExpenseDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} expense={editingExpense} />
    </>
  );
}
