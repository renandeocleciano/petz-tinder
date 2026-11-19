const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatDistance = (km: number | null | undefined): string => {
  if (km === null || km === undefined) return '';
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
};

export const formatAge = (years: number): string => {
  if (years < 1) return 'Filhote';
  return years === 1 ? '1 ano' : `${years} anos`;
};

export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  const days = Math.floor(diff / DAY);
  return days === 1 ? 'ontem' : `${days}d`;
};

export const formatClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const formatPlaydateDate = (iso: string): string => {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayMonth = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized}, ${dayMonth.replace('.', '')}`;
};

export const formatCompactNumber = (value: number): string => {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands
    .toFixed(thousands < 10 ? 1 : 0)
    .replace('.', ',')
    .replace(',0', '')} mil`;
};

export const formatCurrencyBRL = (value: number): string =>
  `R$ ${value.toFixed(2).replace('.', ',')}`;
