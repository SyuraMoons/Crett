export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const noopStorage = {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => {},
      removeItem: (_key: string) => {},
      clear: () => {},
      key: (_index: number) => null,
      length: 0,
    }
    try {
      Object.defineProperty(globalThis, "localStorage", {
        value: noopStorage,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, "sessionStorage", {
        value: noopStorage,
        writable: true,
        configurable: true,
      })
    } catch {}
  }
}
