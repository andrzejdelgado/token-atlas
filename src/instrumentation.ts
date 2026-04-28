/**
 * Next.js instrumentation file — runs once on server startup before any page renders.
 * Provides a no-op localStorage shim for the server so Next.js's DevOverlay
 * (and any other code that calls localStorage without a window guard) doesn't crash.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const store: Record<string, string> = {};

    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;

    // Only polyfill if the runtime has an incomplete localStorage (Next.js 15 DevOverlay bug)
    if (
      typeof globalThis.localStorage === "undefined" ||
      typeof (globalThis.localStorage as Storage).getItem !== "function"
    ) {
      Object.defineProperty(globalThis, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
    if (
      typeof globalThis.sessionStorage === "undefined" ||
      typeof (globalThis.sessionStorage as Storage).getItem !== "function"
    ) {
      Object.defineProperty(globalThis, "sessionStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
  }
}
