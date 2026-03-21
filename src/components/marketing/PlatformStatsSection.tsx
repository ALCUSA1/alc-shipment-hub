import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

const stats = [
  { value: 5000, suffix: "+", label: "Shipments Coordinated" },
  { value: 40, suffix: "+", label: "Countries Served" },
  { value: 97, suffix: "%", label: "On-Time Rate" },
  { value: 500, suffix: "+", label: "Active Users" },
];

function useCountUp(target: number, duration = 1800, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, trigger]);
  return count;
}

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1800, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-accent tabular-nums">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-primary-foreground/70 mt-2">{label}</p>
    </div>
  );
}

export function PlatformStatsSection() {
  return (
    <section className="section-padding bg-navy text-primary-foreground">
      <div className="container-narrow">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-medium text-electric mb-4 tracking-wide uppercase">Platform at a Glance</p>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Built for scale. Proven in production.
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
