import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { reservationApi } from '@/api/endpoints';
import { useAuthStore } from '@/lib/auth-store';

// Réservation en ligne (2026-10-30) : visible sur toutes les pages, pour que la
// réception voie une nouvelle demande sans revenir au tableau de bord.
export function DemandesRdvBanner() {
  const role = useAuthStore((s) => s.user?.role);
  const { pathname } = useLocation();
  const actif = role !== 'comptable';

  const { data } = useQuery({
    queryKey: ['reservation-compte'],
    queryFn: reservationApi.compte,
    enabled: actif,
    refetchInterval: 120_000,
    retry: false,
  });

  const enAttente = data?.enAttente ?? 0;
  if (!actif || enAttente === 0 || pathname === '/reservation') return null;

  return (
    <Link
      to="/reservation"
      className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100 transition-colors flex-shrink-0"
    >
      <Inbox size={16} className="text-amber-600 shrink-0" />
      <span className="flex-1">
        <strong>
          {enAttente} demande{enAttente > 1 ? 's' : ''} de rendez-vous
        </strong>{' '}
        à confirmer
      </span>
      <span className="inline-flex items-center gap-1 font-medium">
        Voir <ArrowRight size={14} />
      </span>
    </Link>
  );
}
