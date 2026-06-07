"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SeriesDef<T> {
  key: Extract<keyof T, string>;
  name: string;
  color: string;
  type: "line" | "bar";
  yAxis?: "left" | "right";
}

interface TrendChartProps<T> {
  data: T[];
  series: SeriesDef<T>[];
  height?: number;
}

export function TrendChart<T extends { date: string }>({
  data,
  series,
  height = 200,
}: TrendChartProps<T>) {
  const hasRight = series.some((s) => s.yAxis === "right");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1d222b" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={{ stroke: "#1d222b" }}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        {hasRight && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
        )}
        <Tooltip
          contentStyle={{
            background: "#111419",
            border: "1px solid #272d38",
            borderRadius: 12,
            fontSize: 12,
            color: "#f6f7f9",
          }}
          labelStyle={{ color: "#8b93a3" }}
        />
        {series.map((s) =>
          s.type === "bar" ? (
            <Bar
              key={s.key as string}
              yAxisId={s.yAxis ?? "left"}
              dataKey={s.key as string}
              name={s.name}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              barSize={10}
            />
          ) : (
            <Line
              key={s.key as string}
              yAxisId={s.yAxis ?? "left"}
              type="monotone"
              dataKey={s.key as string}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
