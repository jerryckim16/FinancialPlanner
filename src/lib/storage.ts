import type { Scenario } from "../types";

const STORAGE_KEY = "financialplanner_scenario";

export function saveScenario(scenario: Scenario): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

export function loadScenario(): Scenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Scenario;
  } catch {
    return null;
  }
}
