import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import {
  Building2, Globe, ShieldCheck, Handshake, Lightbulb, Leaf,
  Target, Rocket, MapPin, Users, Zap, CircleDot,
} from "lucide-react";
import syedImg from "@/assets/team/syed.jpg";
import mikeImg from "@/assets/team/mike.jpg";
import paulImg from "@/assets/team/paul.jpg";
import ahadImg from "@/assets/team/ahad.jpg";
import { useEffect, useRef, useState } from "react";

/* ── Count-up hook ── */
function useCountUp(target: number, duration = 1600, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, trigger]);
  return count;
}

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1600, visible);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-electric tabular-nums">{count.toLocaleString()}{suffix}</p>
      <p className="text-xs text-primary-foreground/50 mt-1">{label}</p>
    </div>
  );
}

/* ── Data ── */
const heroStats = [
  { value: 25, suffix: "+", label: "Years Experience" },
  { value: 500, suffix: "+", label: "Happy Clients" },
  { value: 150, suffix: "+", label: "Countries Served" },
  { value: 99, suffix: ".8%", label: "Success Rate" },
];

const milestones = [
  { year: "1996", title: "Foundation in Compton, CA", desc: "Founded by Michael Kuhfal to solve unreliable freight forwarding. Built a reputation for reliability, transparency, and trust.", icon: MapPin },
  { year: "2000s", title: "Expanding Global Reach", desc: "Formed partnerships with carriers and agents worldwide, connecting U.S. businesses to Asia, Europe, and the Middle East.", icon: Globe },
  { year: "2010s", title: "Diversifying Services", desc: "Introduced compliance support, shipment audits, warehousing, and specialized handling for hazardous and sensitive goods.", icon: Users },
  { year: "2020s", title: "Digital Transformation", desc: "Launched ALC TradeHub with instant quotes, real-time tracking, compliance automation, and carbon reporting.", icon: Zap },
  { year: "2025", title: "A New Era of Growth", desc: "Under CEO Syed Hassan-Warsi, ALC became a digital-first NVOCC and Export Trading Company focused on innovation and global growth.", icon: CircleDot },
];

const coreValues = [
  { icon: ShieldCheck, title: "Integrity", desc: "Transparent pricing and honest communication since 1996." },
  { icon: Lightbulb, title: "Innovation", desc: "Simplifying logistics with technology like TradeHub and predictive intelligence." },
  { icon: Target, title: "Reliability", desc: "On-time delivery every time, building trust through consistent performance." },
  { icon: Handshake, title: "Partnership", desc: "Acting as an extension of our customers' teams, not just a service provider." },
  { icon: Globe, title: "Global Mindset", desc: "Breaking down borders to open new markets and opportunities." },
  { icon: Leaf, title: "Sustainability", desc: "Offering eco-friendly solutions and measurable carbon reductions." },
];

const leaders = [
  { name: "Syed Hassan-Warsi", role: "CEO & Chairman", desc: "Leading ALC into digital transformation and growth. Driving evolution to a technology-driven NVOCC and Export Trading Company, focusing on innovation and customer partnerships.", img: syedImg },
  { name: "Michael Kuhfal", role: "Former Founder", desc: "Established ALC in 1996 on trust, integrity, and reliability. Built strong global relationships, ensuring customers receive personalized service.", img: mikeImg },
  { name: "Paul Bishal", role: "Vice President, Operations", desc: "Oversees global operations, streamlining complex supply chains and ensuring compliance. Known for precision and efficiency.", img: paulImg },
  { name: "Ahad Hassan", role: "Operations Manager", desc: "Manages daily execution, scheduling, and compliance. Ensures timely and reliable shipments.", img: ahadImg },
];

/* ── Page ── */
const About = () => {
  return (
    <MarketingLayout>
      <SEO
        title="About ALC – All Logistics Cargo | 25+ Years in Global Trade"
        description="Learn about All Logistics Cargo's 25+ year journey from a traditional freight forwarder to a digital-first NVOCC and Export Trading Company."
      />

      {/* ═══ Hero ═══ */}
      <section className="relative bg-navy text-primary-foreground py-28 md:py-36 overflow-hidden">
        {/* Animated gradient layers */}
        <motion.div
          animate={{ opacity: [0.2, 0.35, 0.2], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--electric)/0.25),transparent_70%)]"
        />
        <motion.div
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,hsl(var(--electric)/0.12),transparent_60%)]"
        />
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary-foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold tracking-widest uppercase text-electric mb-4">About ALC</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              All Logistics Cargo
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-3xl mx-auto">
              For over 25 years, All Logistics Cargo has been the trusted partner for businesses seeking reliable, efficient, and cost-effective logistics solutions worldwide.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 max-w-3xl mx-auto">
              {heroStats.map((s) => (
                <StatCounter key={s.label} {...s} />
              ))}
            </div>
            {/* Glowing divider */}
            <div className="mt-14 mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-electric/60 to-transparent" />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ Our Story ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-start">
              {/* Left: heading with accent bar */}
              <div className="flex gap-4 items-start">
                <div className="hidden md:block w-1 rounded-full bg-electric self-stretch" />
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Our Story</h2>
                  <p className="text-muted-foreground text-sm">Since 1996</p>
                </div>
              </div>
              {/* Right: content */}
              <div>
                <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                  Founded in 1996, All Logistics Cargo (ALC) has nearly three decades of trust in global trade.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We began as a traditional freight forwarder in Compton, California, founded by Michael Kuhfal. Today, we are a digital-first NVOCC and Export Trading Company, combining technology, logistics, and market entry support. Our mission is simple: help businesses enter new markets, provide end-to-end logistics solutions, and create growth opportunities beyond shipping.
                </p>
                <blockquote className="border-l-4 border-electric pl-5 py-2">
                  <p className="text-foreground text-xl md:text-2xl font-semibold italic leading-snug">
                    "We don't just move goods. We unlock global opportunities."
                  </p>
                </blockquote>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ History Timeline ═══ */}
      <section className="py-20 md:py-28 bg-navy text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--electric)/0.15),transparent_60%)]" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">Our History</h2>
          </ScrollReveal>

          <div className="relative">
            {/* Vertical line */}
            <div aria-hidden="true" className="absolute bottom-0 left-5 top-0 w-px bg-primary-foreground/20 md:left-1/2 md:-translate-x-1/2" />

            <div className="flex flex-col gap-10 md:gap-14">
              {milestones.map((m, i) => {
                const isEven = i % 2 === 0;
                const Icon = m.icon;

                const card = (
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="rounded-2xl bg-gradient-to-br from-electric to-[hsl(var(--electric)/0.75)] p-7 md:p-8 text-white shadow-lg shadow-electric/10 cursor-default"
                  >
                    <p className="text-3xl font-bold mb-1 tabular-nums">{m.year}</p>
                    <h3 className="text-lg font-bold mb-2">{m.title}</h3>
                    <p className="text-sm leading-relaxed text-white/80">{m.desc}</p>
                  </motion.div>
                );

                return (
                  <ScrollReveal key={m.year} delay={i * 0.1}>
                    <div className="relative">
                      {/* Mobile */}
                      <div className="flex items-start gap-4 md:hidden">
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-electric/40 bg-navy shadow-[0_0_12px_hsl(var(--electric)/0.3)]">
                          <Icon className="h-4 w-4 text-electric" />
                        </div>
                        <div className="flex-1">{card}</div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-8">
                        <div>{isEven ? card : null}</div>
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-electric/40 bg-navy shadow-[0_0_16px_hsl(var(--electric)/0.35)]">
                          <Icon className="h-5 w-5 text-electric" />
                        </div>
                        <div>{!isEven ? card : null}</div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Mission ═══ */}
      <section className="relative py-20 md:py-28 bg-background overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal>
            <motion.div
              animate={{ boxShadow: ["0 0 0px hsl(var(--electric) / 0)", "0 0 30px hsl(var(--electric) / 0.3)", "0 0 0px hsl(var(--electric) / 0)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-electric/10 ring-1 ring-electric/20"
            >
              <Rocket className="w-8 h-8 text-electric" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
              To fix the fragmentation, inefficiency, and opacity in logistics by delivering simple, transparent, and technology-driven solutions that make global trade easier for every business.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ Core Values ═══ */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-14 text-center">Core Values</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreValues.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: "0 20px 40px -12px hsl(var(--electric) / 0.15)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-7 cursor-default"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-electric/10 mb-4">
                    <v.icon className="w-6 h-6 text-electric" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Leadership ═══ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">Meet the Leadership Team</h2>
            <p className="text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
              The people driving All Logistics Cargo forward with nearly three decades of trust in global trade.
            </p>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8">
            {leaders.map((l, i) => (
              <ScrollReveal key={l.name} delay={i * 0.1}>
                <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl transition-shadow duration-300">
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-2 ring-electric/20 ring-offset-2 ring-offset-card group-hover:ring-electric/50 transition-all duration-300">
                    <img
                      src={l.img}
                      alt={l.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{l.name}</h3>
                  <p className="text-sm text-electric font-medium mb-3">{l.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{l.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20 md:py-28 bg-navy text-primary-foreground overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,hsl(var(--electric)/0.2),transparent_60%)]"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,hsl(var(--electric)/0.1),transparent_50%)]"
        />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-electric/10 ring-1 ring-electric/20">
              <Building2 className="w-7 h-7 text-electric" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Partner with ALC?</h2>
            <p className="text-primary-foreground/60 mb-10 max-w-xl mx-auto">
              Join hundreds of satisfied clients who trust ALC for their logistics needs. Let's discuss how we can optimize your supply chain and drive your business forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="inline-flex items-center justify-center rounded-full bg-electric px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-electric/25 hover:bg-electric/90 transition-colors">
                Start Partnership
              </a>
              <a href="/features" className="inline-flex items-center justify-center rounded-full border border-primary-foreground/20 px-8 py-3 text-sm font-semibold hover:bg-primary-foreground/5 transition-colors">
                Learn About Our Services
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ Contact Info ═══ */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            2320 North Alameda Street, Compton, CA 90222 &nbsp;·&nbsp; (310) 609-0144 &nbsp;·&nbsp; (732) 773-0800 &nbsp;·&nbsp; info@allogisticscargo.com
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">Mon–Fri, 8:00 AM – 5:00 PM PST</p>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default About;
