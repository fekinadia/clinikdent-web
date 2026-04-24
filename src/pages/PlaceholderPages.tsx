import { FileText, Wallet, BarChart3, Settings, Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

function PlaceholderPage({ title, icon, description }: { title: string; icon: React.ReactNode; description: string }) {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">{title}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={icon}
            title="Bientôt disponible"
            description={description}
          />
        </div>
      </div>
    </>
  );
}

export function TreatmentsPage() {
  return (
    <PlaceholderPage
      title="Soins"
      icon={<Activity size={48} />}
      description="Cette section permettra de gérer tous les soins et actes réalisés. Accessible depuis la fiche patient."
    />
  );
}

export function PrescriptionsPage() {
  return (
    <PlaceholderPage
      title="Ordonnances"
      icon={<FileText size={48} />}
      description="Module de création d'ordonnances avec catalogue de médicaments et modèles types en cours de développement."
    />
  );
}

export function FinancePage() {
  return (
    <PlaceholderPage
      title="Facturation"
      icon={<Wallet size={48} />}
      description="Module de facturation, encaissements et suivi des impayés en cours de développement."
    />
  );
}

export function StatsPage() {
  return (
    <PlaceholderPage
      title="Statistiques"
      icon={<BarChart3 size={48} />}
      description="Tableaux de bord analytiques avec graphiques de consultations, recettes et performance du cabinet."
    />
  );
}

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Paramètres"
      icon={<Settings size={48} />}
      description="Configuration du cabinet, catalogue d'actes, types de RDV, utilisateurs et préférences."
    />
  );
}
