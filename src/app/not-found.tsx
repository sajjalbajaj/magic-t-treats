import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-display text-6xl text-accent">404</p>
      <h1 className="text-3xl">We couldn&rsquo;t find that page</h1>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">
        The link may be out of date, or the treat may have been retired. Everything we currently
        bake is on the homepage.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/gallery" variant="secondary">
          Browse the gallery
        </ButtonLink>
      </div>
    </div>
  );
}
