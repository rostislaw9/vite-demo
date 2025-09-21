import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <main className="w-full max-w-4xl overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid min-h-[520px] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between border-b bg-muted/30 p-6 lg:border-b-0 lg:border-r sm:p-8">
            <BrandMark />
            <div className="py-12">
              <div className="mb-5 flex size-14 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Compass className="size-7" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Route not found
              </p>
              <h1 className="mt-3 text-6xl font-semibold tracking-tight">
                404
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              The page may have moved, or the demo route was never wired up.
            </p>
          </section>

          <section className="flex flex-col justify-center p-6 sm:p-8">
            <h2 className="text-3xl font-semibold tracking-tight">
              Nothing lives at this address.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Head back to the console and continue from a known workspace
              route.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/">
                  <LayoutDashboard className="size-4" />
                  Open dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">
                  <ArrowLeft className="size-4" />
                  Return to sign in
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
