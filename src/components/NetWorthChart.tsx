import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { YearProjection } from "../types";
import { formatUSD } from "../lib/format";

interface Props {
  data: YearProjection[];
}

export default function NetWorthChart({ data }: Props) {
  if (data.length === 0) return null;

  const allPositive = data.every((d) => d.netWorth >= 0);
  const allNegative = data.every((d) => d.netWorth <= 0);

  return (
    <div className="card p-4">
      <h3 className="label mb-3">Net Worth Over Time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4f7cff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="netWorthNegGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eceef1" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: "#828b9c" }}
            tickLine={false}
            axisLine={{ stroke: "#d5d9e0" }}
            label={{ value: "Age", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#828b9c" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#828b9c" }}
            tickFormatter={(v: number) => formatUSD(v)}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #d5d9e0",
              boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            }}
            formatter={(value: number) => [formatUSD(value), "Net Worth"]}
            labelFormatter={(label) => `Age ${label}`}
          />
          {(allPositive || !allNegative) && (
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#4f7cff"
              strokeWidth={2}
              fill="url(#netWorthGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          )}
          {allNegative && (
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#netWorthNegGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
