function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-0 rounded-card bg-white', className)}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <p
      className={cn(
        'm-0 font-bold uppercase tracking-[0.08em] text-slate-400',
        compact ? 'text-[9.5px]' : 'text-[10.5px]',
      )}
    >
      {children}
    </p>
  );
}
