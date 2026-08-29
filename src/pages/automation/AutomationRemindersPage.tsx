import { BellRing } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function AutomationRemindersPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold">Rappels</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-md w-full">
          <EmptyState
            icon={<BellRing size={48} />}
            title="Bientôt disponible"
            description="Le suivi détaillé des rappels de rendez-vous automatiques (SMS/WhatsApp) sera bientôt disponible ici."
          />
        </div>
      </div>
    </>
  );
}
