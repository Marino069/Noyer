// Mocks côté serveur (Server Components, route handlers) quand NEXT_PUBLIC_API_MOCKS=true
// (figé au build) ou API_MOCKS_SERVER=true (lu à l'exécution, sans mocks navigateur :
// utilisé par Lighthouse CI pour auditer de vraies pages sans back).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    (process.env.NEXT_PUBLIC_API_MOCKS === "true" ||
      process.env["API_MOCKS_SERVER"] === "true")
  ) {
    const { server } = await import("./mocks/server");
    server.listen();
  }
}
