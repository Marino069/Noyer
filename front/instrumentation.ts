// Mocks côté serveur (Server Components, route handlers) quand NEXT_PUBLIC_API_MOCKS=true.
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PUBLIC_API_MOCKS === "true"
  ) {
    const { server } = await import("./mocks/server");
    server.listen();
  }
}
