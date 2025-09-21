import type { ReactNode } from 'react';

export default function PageShell({
  title,
  description,
  actions,
  children,
  maxWidth = 'max-w-6xl',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto flex w-full flex-col gap-4 ${maxWidth}`}>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </section>
      {children}
    </div>
  );
}
