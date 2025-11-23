import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: 'UP' | 'DOWN' | 'ERROR' | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) {
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2 py-1 text-[10px] font-mono uppercase tracking-widest border',
          'bg-zinc-800/50 text-zinc-500 border-zinc-700',
          className
        )}
      >
        Unknown
      </span>
    );
  }

  const styles = {
    UP: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
    DOWN: 'bg-rose-500/10 text-rose-400 border-rose-500/40',
    ERROR: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
  };

  const labels = {
    UP: 'Operational',
    DOWN: 'Down',
    ERROR: 'Error',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-1 text-[10px] font-mono uppercase tracking-widest border',
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}

