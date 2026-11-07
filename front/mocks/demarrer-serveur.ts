// Démarre une seule fois les mocks MSW côté serveur (instrumentation, ou au besoin).
type AvecMocks = typeof globalThis & { __noyerMocksServeur?: Promise<void> };

export function demarrerMocksServeur(): Promise<void> {
  const g = globalThis as AvecMocks;
  g.__noyerMocksServeur ??= import("./server").then(({ server }) => {
    server.listen();
  });
  return g.__noyerMocksServeur;
}
