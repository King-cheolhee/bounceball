export function logEvent(name: string, params?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info('[analytics:mock]', name, params ?? {});
  }
}
