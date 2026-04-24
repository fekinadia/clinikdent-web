import { format, formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateStr?: string | Date | null) {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, 'dd MMMM yyyy', { locale: fr });
}

export function formatDateShort(dateStr?: string | Date | null) {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, 'dd/MM/yyyy');
}

export function formatTime(dateStr?: string | Date | null) {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, 'HH:mm');
}

export function formatRelative(dateStr?: string | Date | null) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return formatDistance(d, new Date(), { addSuffix: true, locale: fr });
}

export function calculateAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = parseISO(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getInitials(prenom: string, nom: string) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();
}

export function formatMoney(amount?: number) {
  if (amount === undefined || amount === null) return '0';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount);
}
