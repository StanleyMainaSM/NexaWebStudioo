const nativeFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (async (input, init = {}) => {
  const headers = new Headers(
    init.headers ??
      (input instanceof Request ? input.headers : undefined)
  );

  const authorization = headers.get("authorization");

  if (authorization?.startsWith("Bearer sb_secret_")) {
    headers.delete("authorization");
  }

  return nativeFetch(input, {
    ...init,
    headers,
  });
}) as typeof globalThis.fetch;

const serverModule = await import("./server.cjs");

const app =
  typeof serverModule.default === "function"
    ? serverModule.default
    : (serverModule as { default?: { default?: unknown } }).default?.default;

if (typeof app !== "function") {
  throw new Error(
    "The bundled Express server did not export an application function."
  );
}

export default app;