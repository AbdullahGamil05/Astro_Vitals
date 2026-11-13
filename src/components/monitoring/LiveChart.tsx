import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/monitoring/series";
import { axisTick, chartTooltipStyle } from "@/components/charts/TrendChart";
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
  const hasData = points.some((p) => p.value !== null);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-white/15 font-mono text-xs text-orbit-muted"
        style={{ height }}
      >
        No data in this time window
      </div>
    );
  }

  return (
    <div style={{ height }} role="img" aria-label={`${name} chart over the selected time window`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.08)" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatClock(v, false)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickCount={5}
            minTickGap={36}
          />
          <YAxis domain={domain} tick={axisTick} tickLine={false} axisLine={false} width={38} allowDataOverflow />
          {baseline !== undefined ? (
            <ReferenceLine y={baseline} stroke="rgb(255 255 255 / 0.4)" strokeDasharray="3 4" ifOverflow="hidden" />
          ) : null}
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: "#A3B1C6" }}
            cursor={{ stroke: "rgb(255 255 255 / 0.2)", strokeDasharray: "3 3" }}
            labelFormatter={(v) => formatClock(Number(v))}
            formatter={(v) => [`${Number(v).toFixed(decimals)} ${unit}`, name]}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: color }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
