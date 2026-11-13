import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const chartTooltipStyle = {
  backgroundColor: "#0B1626",
  border: "1px solid rgb(255 255 255 / 0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
} as const;

export const axisTick = { fill: "#6F86A3", fontSize: 11 } as const;

interface TrendChartProps<T extends object> {
  data: T[];
  dataKey: keyof T & string;
  xKey: keyof T & string;
  color: string;
  unit: string;
  name: string;
  domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  height?: number;
  interval?: number;
}

export function TrendChart<T extends object>({
  data,
  dataKey,
  xKey,
  color,
  unit,
  name,
  domain = ["auto", "auto"],
  height = 180,
  interval = 3,
}: TrendChartProps<T>) {
  const gradientId = useId().replace(/:/g, "");
  const xKeyName: string = xKey;
  const dataKeyName: string = dataKey;
  return (
    <div style={{ height }} role="img" aria-label={`${name} trend chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
          <XAxis dataKey={xKeyName} tick={axisTick} tickLine={false} axisLine={false} interval={interval} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={domain} width={44} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: "#8AA0BA" }}
            formatter={(v) => [`${v} ${unit}`, name]}
            cursor={{ stroke: "rgb(255 255 255 / 0.15)" }}
          />
          <Area
            type="monotone"
            dataKey={dataKeyName}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
