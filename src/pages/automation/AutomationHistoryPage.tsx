import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function AutomationHistoryPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Historique</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={<History size={48} />}
            title="Bientôt disponible"
            description="L'historique complet des envois automatiques (rappels, no-shows, recalls, WhatsApp) sera bientôt disponible ici."
          />
        </div>
      </div>
    </>
  );
}
