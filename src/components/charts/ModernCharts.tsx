import { useMemo, useId } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, RadialBarChart, RadialBar,
  LineChart, Line, Legend, TooltipProps,
} from "recharts";
import { motion } from "framer-motion";

/* ── Palette ──────────────────────────────────── */
export const CHART_COLORS = {
  blue: "hsl(217, 95%, 58%)",
  emerald: "hsl(152, 69%, 40%)",
  violet: "hsl(267, 84%, 64%)",
  amber: "hsl(38, 92%, 50%)",
  orange: "hsl(24, 95%, 53%)",
  rose: "hsl(346, 77%, 59%)",
  cyan: "hsl(186, 73%, 46%)",
  indigo: "hsl(234, 89%, 67%)",
  pink: "hsl(330, 81%, 60%)",
  teal: "hsl(168, 76%, 42%)",
};

export const PALETTE = [
  CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.violet,
  CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.cyan,
  CHART_COLORS.indigo, CHART_COLORS.orange, CHART_COLORS.pink, CHART_COLORS.teal,
];

/* ── Unique gradient ID hook ──────────────────── */
export function useGradientId(prefix = "g") {
  const id = useId();
  return useMemo(() => `${prefix}-${id.replace(/:/g, "")}`, [prefix, id]);
}

/* ── Custom Tooltip ───────────────────────────── */
function PremiumTooltip({ active, payload, label, dark, formatter }: TooltipProps<number, string> & { dark?: boolean; formatter?: (v: number, name: string) => [string, string] }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3 shadow-2xl border backdrop-blur-xl"
      style={{
        background: dark ? "rgba(15, 20, 35, 0.92)" : "rgba(255, 255, 255, 0.95)",
        borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        boxShadow: dark
          ? "0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)",
      }}
    >
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => {
        const formatted = formatter ? formatter(entry.value as number, entry.name || "") : [`${entry.value}`, entry.name || ""];
        return (
          <div key={i} className="flex items-center gap-2.5 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}60` }} />
            <span className="text-xs font-medium" style={{ color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)" }}>
              {formatted[1]}
            </span>
            <span className="text-sm font-bold tabular-nums ml-auto" style={{ color: dark ? "#fff" : "#111" }}>
              {formatted[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Shared axis styles ───────────────────────── */
const getAxisProps = (dark: boolean) => ({
  tick: { fontSize: 11, fontWeight: 500, fill: dark ? "rgba(255,255,255,0.35)" : "hsl(var(--muted-foreground))" },
  axisLine: false as const,
  tickLine: false as const,
});

const getGridProps = (dark: boolean) => ({
  strokeDasharray: "3 6",
  stroke: dark ? "rgba(255,255,255,0.06)" : "hsl(var(--border))",
  strokeOpacity: 1,
  vertical: false as const,
});

/* ══════════════════════════════════════════════════
   GLASS AREA CHART — Gradient fill + glow stroke
   ══════════════════════════════════════════════════ */
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
  const gid = useGradientId("af");
  const gid2 = useGradientId("af2");
  const glowId = useGradientId("gl");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 20, bottom: 4 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="50%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {secondaryDataKey && (
            <linearGradient id={gid2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.35} />
              <stop offset="50%" stopColor={secondaryColor} stopOpacity={0.06} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0} />
            </linearGradient>
          )}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {showGrid && <CartesianGrid {...getGridProps(dark)} />}
        <XAxis dataKey={xKey} {...getAxisProps(dark)} />
        <YAxis {...getAxisProps(dark)} tickFormatter={yFormatter} />
        <Tooltip content={<PremiumTooltip dark={dark} formatter={tooltipFormatter} />} />
        <Area
          type="natural" dataKey={dataKey} stroke={color} fill={`url(#${gid})`}
          strokeWidth={2.5} dot={false}
          activeDot={{ r: 5, fill: color, stroke: dark ? "#0f1423" : "#fff", strokeWidth: 3, filter: `url(#${glowId})` }}
          animationDuration={1200} animationEasing="ease-out"
        />
        {secondaryDataKey && (
          <Area
            type="natural" dataKey={secondaryDataKey} stroke={secondaryColor} fill={`url(#${gid2})`}
            strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: secondaryColor, stroke: dark ? "#0f1423" : "#fff", strokeWidth: 3, filter: `url(#${glowId})` }}
            animationDuration={1200} animationEasing="ease-out"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ══════════════════════════════════════════════════
   GLASS BAR CHART — Rounded bars + gradient fill
   ══════════════════════════════════════════════════ */
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
  dark = false, barSize = 32,
}: GlassBarChartProps) {
  const bid = useGradientId("bf");
  const bid2 = useGradientId("bf2");
  const isVert = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={isVert ? { left: 0, right: 16 } : { left: -10, right: 8, top: 12, bottom: 4 }}>
        <defs>
          <linearGradient id={bid} x1="0" y1="0" x2={isVert ? "1" : "0"} y2={isVert ? "0" : "1"}>
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </linearGradient>
          {secondaryDataKey && (
            <linearGradient id={bid2} x1="0" y1="0" x2={isVert ? "1" : "0"} y2={isVert ? "0" : "1"}>
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={1} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.5} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid {...getGridProps(dark)} vertical={isVert} horizontal={!isVert} />
        {isVert ? (
          <>
            <XAxis type="number" {...getAxisProps(dark)} allowDecimals={false} tickFormatter={yFormatter} />
            <YAxis type="category" dataKey={xKey} {...getAxisProps(dark)} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...getAxisProps(dark)} />
            <YAxis {...getAxisProps(dark)} allowDecimals={false} tickFormatter={yFormatter} />
          </>
        )}
        <Tooltip content={<PremiumTooltip dark={dark} formatter={tooltipFormatter} />} cursor={{ fill: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", radius: 8 }} />
        <Bar dataKey={dataKey} fill={`url(#${bid})`} radius={isVert ? [0, 8, 8, 0] : [8, 8, 0, 0]} maxBarSize={barSize} animationDuration={900} />
        {secondaryDataKey && (
          <Bar dataKey={secondaryDataKey} fill={`url(#${bid2})`} radius={isVert ? [0, 8, 8, 0] : [8, 8, 0, 0]} maxBarSize={barSize} animationDuration={900} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ══════════════════════════════════════════════════
   GLASS DONUT — Gradient cells + center label
   ══════════════════════════════════════════════════ */
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
  const uid = useGradientId("dn");

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {data.map((entry, i) => {
              const c = entry.fill || PALETTE[i % PALETTE.length];
              return (
                <linearGradient key={`${uid}-${i}`} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={1} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                </linearGradient>
              );
            })}
          </defs>
          <Pie
            data={data.filter(d => d.value > 0)} cx="50%" cy="50%"
            innerRadius={innerRadius} outerRadius={outerRadius}
            paddingAngle={3} dataKey="value" stroke="none"
            animationBegin={100} animationDuration={1000} animationEasing="ease-out"
          >
            {data.filter(d => d.value > 0).map((_, i) => (
              <Cell key={i} fill={`url(#${uid}-${i})`} />
            ))}
          </Pie>
          <Tooltip content={<PremiumTooltip dark={dark} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className={`text-2xl font-black tracking-tight ${dark ? "text-white" : "text-foreground"}`}>{centerValue}</span>
          )}
          {centerLabel && (
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-white/40" : "text-muted-foreground"}`}>{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   GLASS GAUGE — Radial progress
   ══════════════════════════════════════════════════ */
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
  const gid = useGradientId("gg");
  const data = [{ name: label, value: Math.min(value, max) }];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} data={data} barSize={14}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <RadialBar dataKey="value" cornerRadius={14} fill={`url(#${gid})`} background={{ fill: dark ? "rgba(255,255,255,0.05)" : "hsl(var(--secondary))" }} animationDuration={1200} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black tracking-tight ${dark ? "text-white" : "text-foreground"}`}>{value}%</span>
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-white/40" : "text-muted-foreground"}`}>{label}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   GLASS LINE CHART — Multi-line + glow dots
   ══════════════════════════════════════════════════ */
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
  const glowId = useGradientId("lg");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 12, bottom: 4 }}>
        <defs>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid {...getGridProps(dark)} />
        <XAxis dataKey={xKey} {...getAxisProps(dark)} />
        <YAxis {...getAxisProps(dark)} tickFormatter={yFormatter} />
        <Tooltip content={<PremiumTooltip dark={dark} formatter={tooltipFormatter} />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", paddingTop: "16px" }}
          iconType="circle"
          iconSize={8}
        />
        {lines.map((line) => (
          <Line
            key={line.dataKey} type="natural" dataKey={line.dataKey}
            name={line.name || line.dataKey} stroke={line.color} strokeWidth={2.5}
            dot={{ r: 3.5, fill: line.color, stroke: dark ? "#0f1423" : "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: line.color, stroke: dark ? "#0f1423" : "#fff", strokeWidth: 3, filter: `url(#${glowId})` }}
            connectNulls animationDuration={1200} animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ══════════════════════════════════════════════════
   ANIMATED PROGRESS BAR
   ══════════════════════════════════════════════════ */
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
      <div className="h-2 bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full absolute inset-y-0 left-0"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}80)`,
            boxShadow: `0 0 16px ${color}25`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.06 * index, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
