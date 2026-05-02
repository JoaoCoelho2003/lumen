type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6 text-card-foreground shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-7 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="text-base font-semibold">L</span>
            </div>
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div>{children}</div>

        {footer ? <div className="mt-6">{footer}</div> : null}
      </section>
    </main>
  );
}
