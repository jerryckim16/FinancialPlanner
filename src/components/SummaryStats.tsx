import type { YearProjection, Scenario } from "../types";
import { formatUSD, formatPct } from "../lib/format";

interface Props {
  data: YearProjection[];
  scenario: Scenario;
}

export default function SummaryStats({ data, scenario }: Props) {
  if (data.length === 0) return null;

  const last = data[data.length - 1];
  const first = data[0];
  const effectiveTaxRate =
    scenario.annualIncome > 0 ? first.totalTax / scenario.annualIncome : 0;
  const savingsRate =
    first.netIncome > 0 ? first.annualSavings / first.netIncome : 0;
  const yearsToRetire = scenario.retirementAge - scenario.currentAge;

  return (
    <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="stat">
        <span className="label">Retirement Net Worth</span>
        <span
          className={`stat-value ${last.netWorth < 0 ? "text-red-500" : "text-ink-900"}`}
        >
          {formatUSD(last.netWorth)}
        </span>
        <span className="text-[10px] text-ink-400">
          at age {scenario.retirementAge}
        </span>
      </div>

      <div className="stat">
        <span className="label">Effective Tax Rate</span>
        <span className="stat-value">{formatPct(effectiveTaxRate)}</span>
        <span className="text-[10px] text-ink-400">
          {formatUSD(first.totalTax)}/yr
        </span>
      </div>

      <div className="stat">
        <span className="label">Savings Rate</span>
        <span
          className={`stat-value ${savingsRate < 0 ? "text-red-500" : "text-ink-900"}`}
        >
          {formatPct(savingsRate)}
        </span>
        <span className="text-[10px] text-ink-400">
          {formatUSD(first.annualSavings)}/yr
        </span>
      </div>

      <div className="stat">
        <span className="label">Years to Retire</span>
        <span className="stat-value">{yearsToRetire}</span>
        <span className="text-[10px] text-ink-400">
          ages {scenario.currentAge} – {scenario.retirementAge}
        </span>
      </div>
    </div>
  );
}
