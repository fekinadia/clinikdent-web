import clsx from 'clsx';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  prenom: string;
  nom: string;
  sexe?: 'M' | 'F';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ prenom, nom, sexe, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  const colors = sexe === 'F'
    ? 'bg-pink-100 text-pink-700'
    : sexe === 'M'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-slate-200 text-slate-700';

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizes[size],
        colors,
        className
      )}
    >
      {getInitials(prenom, nom)}
    </div>
  );
}
