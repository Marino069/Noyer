import { API_MOCKS } from "@/lib/env";

let started: Promise<void> | null = null;

/** Démarre le service worker MSW une seule fois ; résolu tout de suite hors mode mocks. */
export function startMocks(): Promise<void> {
  if (!API_MOCKS) return Promise.resolve();
  started ??= import("@/mocks/browser")
    .then(({ worker }) => worker.start({ quiet: true }))
    .then(() => undefined)
    .catch(() => undefined);
  return started;
}
