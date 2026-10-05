"use client";

import { ErrorState } from "@/components/ErrorState";
import fr from "@/i18n/dictionaries/fr.json";

export default function LocaleError({ reset }: { reset: () => void }) {
  return (
    <main>
      <ErrorState
        title={fr.error.title}
        message={fr.error.message}
        retryLabel={fr.error.retry}
        onRetry={reset}
      />
    </main>
  );
}
