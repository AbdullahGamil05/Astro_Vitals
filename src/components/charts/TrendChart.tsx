import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const chartTooltipStyle = {
  backgroundColor: "#0B0F19",
  border: "1px solid rgb(255 255 255 / 0.15)",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "JetBrains Mono, monospace",
  color: "#F8FAFC",
  boxShadow: "none",
} as const;

export const axisTick = { fill: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono, monospace" } as const;

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
  const xKeyName: string = xKey;
  const dataKeyName: string = dataKey;
  return (
    <div style={{ height }} role="img" aria-label={`${name} trend chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.08)" vertical={false} />
          <XAxis dataKey={xKeyName} tick={axisTick} tickLine={false} axisLine={false} interval={interval} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={domain} width={38} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: "#A3B1C6" }}
            formatter={(v) => [`${v} ${unit}`, name]}
            cursor={{ stroke: "rgb(255 255 255 / 0.2)", strokeDasharray: "3 3" }}
          />
          <Line
            type="linear"
            dataKey={dataKeyName}
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
