import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function AutomationNoShowsPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">No-Shows</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={<Clock size={48} />}
            title="Bientôt disponible"
            description="La détection et la relance automatique des rendez-vous manqués (no-shows) seront bientôt disponibles ici."
          />
        </div>
      </div>
    </>
  );
}
