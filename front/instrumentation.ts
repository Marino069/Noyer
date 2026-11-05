// Mocks côté serveur (Server Components, route handlers) quand NEXT_PUBLIC_API_MOCKS=true,
// ou seulement côté serveur avec API_MOCKS_SERVEUR=true (Lighthouse CI : pages remplies
// sans back et sans retarder l'affichage dans le navigateur).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.NEXT_PUBLIC_API_MOCKS === "true" ||
      process.env.API_MOCKS_SERVEUR === "true")
  ) {
    const { server } = await import("./mocks/server");
    server.listen();
  }
}
