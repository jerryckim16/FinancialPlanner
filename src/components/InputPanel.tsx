import { useState } from "react";
import type { Scenario, Subscription } from "../types";
import { STATE_CODES } from "../lib/tax";

interface Props {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
}

export default function InputPanel({ scenario, onChange }: Props) {
  const [newSubName, setNewSubName] = useState("");
  const [newSubAmt, setNewSubAmt] = useState("");

  const set = <K extends keyof Scenario>(key: K, val: Scenario[K]) =>
    onChange({ ...scenario, [key]: val });

  const setCost = <K extends keyof Scenario["costs"]>(
    key: K,
    val: Scenario["costs"][K],
  ) => onChange({ ...scenario, costs: { ...scenario.costs, [key]: val } });

  const num = (
    label: string,
    value: number,
    onValue: (v: number) => void,
    opts?: { min?: number; max?: number; step?: number; prefix?: string; suffix?: string },
  ) => (
    <div className="flex flex-col gap-1">
      <label className="label">{label}</label>
      <div className="relative">
        {opts?.prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-400">
            {opts.prefix}
          </span>
        )}
        <input
          type="number"
          className={`field ${opts?.prefix ? "pl-6" : ""} ${opts?.suffix ? "pr-8" : ""}`}
          value={value}
          min={opts?.min}
          max={opts?.max}
          step={opts?.step ?? 1}
          onChange={(e) => onValue(Number(e.target.value))}
        />
        {opts?.suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-400">
            {opts.suffix}
          </span>
        )}
      </div>
    </div>
  );

  const addSubscription = () => {
    const amt = parseFloat(newSubAmt);
    if (!newSubName.trim() || isNaN(amt) || amt <= 0) return;
    const sub: Subscription = { name: newSubName.trim(), amount: amt };
    setCost("subscriptions", [...scenario.costs.subscriptions, sub]);
    setNewSubName("");
    setNewSubAmt("");
  };

  const removeSubscription = (idx: number) => {
    setCost(
      "subscriptions",
      scenario.costs.subscriptions.filter((_, i) => i !== idx),
    );
  };

  return (
    <div className="flex flex-col gap-5 overflow-y-auto">
      {/* ---- Profile ---- */}
      <section className="card p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Profile
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {num("Current Age", scenario.currentAge, (v) => set("currentAge", v), { min: 16, max: 100 })}
          {num("Retirement Age", scenario.retirementAge, (v) => set("retirementAge", v), { min: scenario.currentAge + 1, max: 100 })}
        </div>
        {num("Starting Savings", scenario.startingSavings, (v) => set("startingSavings", v), { min: 0, prefix: "$" })}
        {num("Annual Income", scenario.annualIncome, (v) => set("annualIncome", v), { min: 0, prefix: "$" })}
        {num("Annual Return Rate", scenario.annualReturnRate * 100, (v) => set("annualReturnRate", v / 100), { min: -50, max: 100, step: 0.5, suffix: "%" })}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="label">Filing Status</label>
            <select
              className="field"
              value={scenario.filingStatus}
              onChange={(e) =>
                set("filingStatus", e.target.value as "single" | "married")
              }
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">State</label>
            <select
              className="field"
              value={scenario.state}
              onChange={(e) => set("state", e.target.value)}
            >
              {STATE_CODES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ---- Monthly Costs ---- */}
      <section className="card p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Monthly Costs
        </h3>
        {num("Rent", scenario.costs.rent, (v) => setCost("rent", v), { min: 0, prefix: "$" })}
        <div className="grid grid-cols-2 gap-3">
          {num("Car Payment", scenario.costs.carPayment, (v) => setCost("carPayment", v), { min: 0, prefix: "$" })}
          {num("Car Insurance", scenario.costs.carInsurance, (v) => setCost("carInsurance", v), { min: 0, prefix: "$" })}
        </div>
        {num("Food", scenario.costs.food, (v) => setCost("food", v), { min: 0, prefix: "$" })}
        <div className="grid grid-cols-2 gap-3">
          {num("Phone", scenario.costs.phone, (v) => setCost("phone", v), { min: 0, prefix: "$" })}
          {num("Utilities", scenario.costs.utilities, (v) => setCost("utilities", v), { min: 0, prefix: "$" })}
        </div>

        {/* Subscriptions */}
        <div className="border-t border-ink-100 pt-3 flex flex-col gap-2">
          <span className="label">Subscriptions</span>
          {scenario.costs.subscriptions.map((sub, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded bg-ink-50 px-2 py-1 text-sm"
            >
              <span>
                {sub.name}{" "}
                <span className="font-mono text-ink-400">
                  ${sub.amount}/mo
                </span>
              </span>
              <button
                className="text-ink-300 hover:text-red-500 transition-colors text-xs"
                onClick={() => removeSubscription(i)}
              >
                remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="Name"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
            />
            <input
              className="field w-20"
              type="number"
              placeholder="$/mo"
              value={newSubAmt}
              onChange={(e) => setNewSubAmt(e.target.value)}
            />
            <button
              className="rounded bg-accent px-3 py-1 text-xs font-medium text-white
                hover:bg-accent/90 transition-colors"
              onClick={addSubscription}
            >
              Add
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
