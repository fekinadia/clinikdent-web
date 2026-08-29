import { RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function AutomationRecallsPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Recalls</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={<RotateCcw size={48} />}
            title="Bientôt disponible"
            description="La gestion automatisée des recalls (relances patients à réactiver) sera bientôt disponible ici."
          />
        </div>
      </div>
    </>
  );
}
