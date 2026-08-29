import { Gauge } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function AutomationOverviewPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Vue d'ensemble</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={<Gauge size={48} />}
            title="Bientôt disponible"
            description="Le tableau de bord de l'automatisation patients (rappels, no-shows, recalls, WhatsApp) regroupera bientôt ici une vue synthétique de l'activité."
          />
        </div>
      </div>
    </>
  );
}
