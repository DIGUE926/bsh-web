"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type ChartPoint = {
  date: string;
  label: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
};

export default function PlayerTrendChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) return null;

  return (
    <div className="mb-12">
      <h2 className="font-display text-base text-bsh-gold mb-3 tracking-wide">
        TENDANCE
      </h2>
      <div className="border border-white/10 rounded-lg bg-white/5 p-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0D0D0D",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              type="monotone"
              dataKey="pts"
              name="PTS"
              stroke="#FF6B00"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="reb"
              name="REB"
              stroke="#FFD60A"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ast"
              name="AST"
              stroke="#ffffff"
              strokeOpacity={0.6}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
