import type { YearProjection } from "../types";
import { formatUSD } from "../lib/format";

interface Props {
  data: YearProjection[];
}

export default function YearTable({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-xs font-mono tabular-nums">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            {[
              "Age",
              "Gross Income",
              "Fed Tax",
              "State Tax",
              "Net Income",
              "Costs",
              "Savings",
              "Inv. Gains",
              "Net Worth",
            ].map((h) => (
              <th key={h} className="label px-3 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((y) => (
            <tr
              key={y.age}
              className="border-b border-ink-50 hover:bg-ink-50/50 transition-colors"
            >
              <td className="px-3 py-1.5 font-medium text-ink-600">{y.age}</td>
              <td className="px-3 py-1.5">{formatUSD(y.grossIncome)}</td>
              <td className="px-3 py-1.5 text-ink-400">
                {formatUSD(y.federalTax)}
              </td>
              <td className="px-3 py-1.5 text-ink-400">
                {formatUSD(y.stateTax)}
              </td>
              <td className="px-3 py-1.5">{formatUSD(y.netIncome)}</td>
              <td className="px-3 py-1.5 text-ink-400">
                {formatUSD(y.annualCosts)}
              </td>
              <td
                className={`px-3 py-1.5 ${y.annualSavings < 0 ? "text-red-500" : ""}`}
              >
                {formatUSD(y.annualSavings)}
              </td>
              <td className="px-3 py-1.5 text-ink-400">
                {formatUSD(y.investmentGains)}
              </td>
              <td
                className={`px-3 py-1.5 font-semibold ${y.netWorth < 0 ? "text-red-500" : "text-ink-900"}`}
              >
                {formatUSD(y.netWorth)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
