import { useState, useMemo, useEffect } from "react";
import type { Scenario } from "./types";
import { runProjection } from "./lib/projection";
import { loadScenario, saveScenario } from "./lib/storage";
import InputPanel from "./components/InputPanel";
import NetWorthChart from "./components/NetWorthChart";
import SummaryStats from "./components/SummaryStats";
import YearTable from "./components/YearTable";

const DEFAULT_SCENARIO: Scenario = {
  currentAge: 25,
  retirementAge: 65,
  startingSavings: 10_000,
  annualIncome: 75_000,
  annualReturnRate: 0.07,
  filingStatus: "single",
  state: "CA",
  costs: {
    rent: 1500,
    carPayment: 300,
    carInsurance: 120,
    food: 500,
    phone: 60,
    utilities: 150,
    subscriptions: [
      { name: "Netflix", amount: 15 },
      { name: "YouTube", amount: 14 },
    ],
  },
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(
    () => loadScenario() ?? DEFAULT_SCENARIO,
  );
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    saveScenario(scenario);
  }, [scenario]);

  const projection = useMemo(() => runProjection(scenario), [scenario]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ink-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight text-ink-800">
            Financial Planner
          </h1>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
            MVP
          </span>
        </div>
        <button
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
          onClick={() => setScenario(DEFAULT_SCENARIO)}
        >
          Reset to defaults
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Sidebar — inputs */}
        <aside className="lg:w-[360px] shrink-0 border-r border-ink-100 bg-white p-4 overflow-y-auto">
          <InputPanel scenario={scenario} onChange={setScenario} />
        </aside>

        {/* Content — chart + stats + table */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
          <SummaryStats data={projection} scenario={scenario} />
          <NetWorthChart data={projection} />
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
              onClick={() => setShowTable((t) => !t)}
            >
              {showTable ? "Hide" : "Show"} year-by-year breakdown
            </button>
          </div>
          {showTable && <YearTable data={projection} />}
        </main>
      </div>
    </div>
  );
}
