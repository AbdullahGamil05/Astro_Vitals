import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/monitoring/series";
import { formatClock } from "@/lib/time";

interface LiveChartProps {
  points: ChartPoint[];
  color: string;
  name: string;
  unit: string;
  decimals: number;
  domain: [number, number];
  baseline?: number;
  height?: number;
}

export function LiveChart({ points, color, name, unit, decimals, domain, baseline, height = 140 }: LiveChartProps) {
  const gradientId = useId();
  const hasData = points.some((p) => p.value !== null);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-orbit-muted"
        style={{ height }}
      >
        No data in this time window
      </div>
    );
  }

  return (
    <div style={{ height }} role="img" aria-label={`${name} chart over the selected time window`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatClock(v, false)}
            tick={{ fill: "#7C8BA3", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            minTickGap={36}
          />
          <YAxis domain={domain} tick={{ fill: "#7C8BA3", fontSize: 10 }} tickLine={false} axisLine={false} width={44} allowDataOverflow />
          {baseline !== undefined ? (
            <ReferenceLine y={baseline} stroke="rgb(255 255 255 / 0.35)" strokeDasharray="4 4" ifOverflow="hidden" />
          ) : null}
          <Tooltip
            contentStyle={{ background: "#0B1626", border: "1px solid rgb(255 255 255 / 0.12)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9FB0C7" }}
            labelFormatter={(v) => formatClock(Number(v))}
            formatter={(v) => [`${Number(v).toFixed(decimals)} ${unit}`, name]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls={false}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
