import type { CalendarProvider } from "./types.js";

const registry = new Map<string, CalendarProvider>();

export function registerProvider(provider: CalendarProvider): void {
  registry.set(provider.name, provider);
}

export function getProvider(name: string): CalendarProvider {
  const p = registry.get(name);
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}
