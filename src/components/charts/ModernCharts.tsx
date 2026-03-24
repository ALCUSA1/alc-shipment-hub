import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, RadialBarChart, RadialBar,
  LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";

/* ── Shared constants ─────────────────────────── */
export const CHART_COLORS = {
  blue: "hsl(215, 100%, 55%)",
  emerald: "hsl(152, 69%, 40%)",
  violet: "hsl(280, 65%, 55%)",
  amber: "hsl(45, 93%, 47%)",
  orange: "hsl(25, 95%, 53%)",
  rose: "hsl(340, 75%, 55%)",
  cyan: "hsl(190, 80%, 45%)",
  indigo: "hsl(237, 74%, 60%)",
};

export const PALETTE = [
  CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.violet,
  CHART_COLORS.amber, CHART_COLORS.orange, CHART_COLORS.rose,
  CHART_COLORS.cyan, CHART_COLORS.indigo,
];

/* ── Shared tooltip style ─────────────────────── */
export const modernTooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 14,
  fontSize: 12,
  boxShadow: "0 20px 60px -15px hsl(var(--accent) / 0.2), 0 0 0 1px hsl(var(--border) / 0.5)",
  padding: "12px 16px",
  backdropFilter: "blur(12px)",
};

export const darkTooltipStyle = {
  background: "hsl(220, 18%, 10%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: 14,
  fontSize: 12,
  boxShadow: "0 20px 60px -15px rgba(0,0,0,0.5)",
  padding: "12px 16px",
  color: "#fff",
};

/* ── Gradient IDs generator ───────────────────── */
let gradCounter = 0;
export function useGradientId(prefix = "grad") {
  return useMemo(() => `${prefix}-${++gradCounter}-${Math.random().toString(36).slice(2, 6)}`, [prefix]);
}

/* ── Modern Area Chart ────────────────────────── */
interface GlassAreaChartProps {
  data: any[];
  dataKey: string;
  xKey?: string;
  color?: string;
  secondaryDataKey?: string;
  secondaryColor?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number, name: string) => [string, string];
  showGrid?: boolean;
  dark?: boolean;
}

export function GlassAreaChart({
  data, dataKey, xKey = "month", color = CHART_COLORS.blue,
  secondaryDataKey, secondaryColor = CHART_COLORS.emerald,
  height = 260, yFormatter, tooltipFormatter, showGrid = true, dark = false,
}: GlassAreaChartProps) {
  const id = useGradientId("area");
  const id2 = useGradientId("area2");
  const glowId = useGradientId("glow");
  const ts = dark ? darkTooltipStyle : modernTooltipStyle;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -10, right: 12, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="40%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {secondaryDataKey && (
            <linearGradient id={id2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.3} />
              <stop offset="40%" stopColor={secondaryColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0} />
            </linearGradient>
          )}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="4 4" stroke={dark ? "hsl(220,15%,15%)" : "hsl(var(--border))"} strokeOpacity={0.5} vertical={false} />
        )}
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
        <Tooltip contentStyle={ts} formatter={tooltipFormatter} />
        <Area
          type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${id})`}
          strokeWidth={2.5} dot={false}
          activeDot={{ r: 6, fill: color, stroke: dark ? "hsl(220,18%,10%)" : "hsl(var(--background))", strokeWidth: 3, filter: `url(#${glowId})` }}
        />
        {secondaryDataKey && (
          <Area
            type="monotone" dataKey={secondaryDataKey} stroke={secondaryColor} fill={`url(#${id2})`}
            strokeWidth={2.5} dot={false}
            activeDot={{ r: 6, fill: secondaryColor, stroke: dark ? "hsl(220,18%,10%)" : "hsl(var(--background))", strokeWidth: 3, filter: `url(#${glowId})` }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Modern Bar Chart ─────────────────────────── */
interface GlassBarChartProps {
  data: any[];
  dataKey: string;
  xKey?: string;
  color?: string;
  secondaryDataKey?: string;
  secondaryColor?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number, name: string) => [string, string];
  dark?: boolean;
  barSize?: number;
}

export function GlassBarChart({
  data, dataKey, xKey = "month", color = CHART_COLORS.blue,
  secondaryDataKey, secondaryColor = CHART_COLORS.rose,
  height = 260, layout = "horizontal", yFormatter, tooltipFormatter,
  dark = false, barSize = 40,
}: GlassBarChartProps) {
  const id = useGradientId("bar");
  const id2 = useGradientId("bar2");
  const ts = dark ? darkTooltipStyle : modernTooltipStyle;
  const isVert = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={isVert ? { left: 0, right: 16 } : { left: -10, right: 12, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2={isVert ? "1" : "0"} y2={isVert ? "0" : "1"}>
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.45} />
          </linearGradient>
          {secondaryDataKey && (
            <linearGradient id={id2} x1="0" y1="0" x2={isVert ? "1" : "0"} y2={isVert ? "0" : "1"}>
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.95} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.45} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={dark ? "hsl(220,15%,15%)" : "hsl(var(--border))"} strokeOpacity={0.4} vertical={!isVert} horizontal={isVert} />
        {isVert ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={yFormatter} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={yFormatter} />
          </>
        )}
        <Tooltip contentStyle={ts} formatter={tooltipFormatter} cursor={{ fill: "hsl(var(--accent) / 0.06)", radius: 8 }} />
        <Bar dataKey={dataKey} fill={`url(#${id})`} radius={isVert ? [0, 10, 10, 0] : [10, 10, 4, 4]} maxBarSize={barSize} animationDuration={1000} />
        {secondaryDataKey && (
          <Bar dataKey={secondaryDataKey} fill={`url(#${id2})`} radius={isVert ? [0, 10, 10, 0] : [10, 10, 4, 4]} maxBarSize={barSize} animationDuration={1000} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Modern Donut Chart ───────────────────────── */
interface GlassDonutProps {
  data: { name: string; value: number; fill?: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  dark?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}

export function GlassDonut({
  data, height = 180, innerRadius = 52, outerRadius = 80, dark = false,
  centerLabel, centerValue,
}: GlassDonutProps) {
  const ts = dark ? darkTooltipStyle : modernTooltipStyle;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {data.map((entry, i) => (
              <linearGradient key={`dg-${i}`} id={`donutGrad-${i}-${entry.name}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={entry.fill || PALETTE[i % PALETTE.length]} stopOpacity={1} />
                <stop offset="100%" stopColor={entry.fill || PALETTE[i % PALETTE.length]} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data.filter(d => d.value > 0)}
            cx="50%" cy="50%"
            innerRadius={innerRadius} outerRadius={outerRadius}
            paddingAngle={4} dataKey="value" stroke="none"
            animationBegin={0} animationDuration={900}
          >
            {data.filter(d => d.value > 0).map((entry, i) => (
              <Cell key={i} fill={`url(#donutGrad-${i}-${entry.name})`} />
            ))}
          </Pie>
          <Tooltip contentStyle={ts} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className={`text-2xl font-bold ${dark ? "text-white" : "text-foreground"}`}>{centerValue}</span>
          )}
          {centerLabel && (
            <span className={`text-[10px] ${dark ? "text-[hsl(220,10%,50%)]" : "text-muted-foreground"}`}>{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modern Gauge/Radial ──────────────────────── */
interface GlassGaugeProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
  dark?: boolean;
}

export function GlassGauge({
  value, max = 100, label = "on-time", color = CHART_COLORS.emerald, size = 160, dark = false,
}: GlassGaugeProps) {
  const id = useGradientId("gauge");
  const data = [{ name: label, value: Math.min(value, max) }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} data={data} barSize={16}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <RadialBar dataKey="value" cornerRadius={12} fill={`url(#${id})`} background={{ fill: dark ? "hsl(220,15%,15%)" : "hsl(var(--secondary))" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${dark ? "text-white" : "text-foreground"}`}>{value}%</span>
        <span className={`text-[10px] ${dark ? "text-[hsl(220,10%,50%)]" : "text-muted-foreground"}`}>{label}</span>
      </div>
    </div>
  );
}

/* ── Modern Line Chart ────────────────────────── */
interface GlassLineChartProps {
  data: any[];
  lines: { dataKey: string; color: string; name?: string }[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number, name: string) => [string, string];
  dark?: boolean;
}

export function GlassLineChart({
  data, lines, xKey = "month", height = 400, yFormatter, tooltipFormatter, dark = false,
}: GlassLineChartProps) {
  const glowId = useGradientId("lineGlow");
  const ts = dark ? darkTooltipStyle : modernTooltipStyle;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={dark ? "hsl(220,15%,15%)" : "hsl(var(--border))"} strokeOpacity={0.5} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: dark ? "hsl(220,10%,40%)" : "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={yFormatter} />
        <Tooltip contentStyle={ts} formatter={tooltipFormatter} />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
        {lines.map((line) => (
          <Line
            key={line.dataKey} type="monotone" dataKey={line.dataKey}
            name={line.name || line.dataKey} stroke={line.color} strokeWidth={2.5}
            dot={{ r: 4, fill: line.color, stroke: dark ? "hsl(220,18%,10%)" : "hsl(var(--background))", strokeWidth: 2 }}
            activeDot={{ r: 7, fill: line.color, stroke: dark ? "hsl(220,18%,10%)" : "hsl(var(--background))", strokeWidth: 3, filter: `url(#${glowId})` }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Animated Progress Bar ────────────────────── */
interface AnimatedBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  index?: number;
  suffix?: string | number;
}

export function AnimatedProgressBar({ label, value, max, color, index = 0, suffix }: AnimatedBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground truncate max-w-[75%]">{label}</span>
        <span className="text-xs font-bold text-foreground tabular-nums">{suffix ?? value}</span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full absolute inset-y-0 left-0"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}90)`,
            boxShadow: `0 0 12px ${color}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.08 * index, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
