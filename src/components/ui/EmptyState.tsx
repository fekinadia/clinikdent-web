import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="text-slate-300 inline-block mb-4">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
