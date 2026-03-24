import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Building2, Globe, ShieldCheck, Handshake, Lightbulb, Leaf, Target, Rocket, MapPin, Users, Zap, CircleDot } from "lucide-react";
import syedImg from "@/assets/team/syed.jpg";
import mikeImg from "@/assets/team/mike.jpg";
import paulImg from "@/assets/team/paul.jpg";
import ahadImg from "@/assets/team/ahad.jpg";

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

const About = () => {
  return (
    <MarketingLayout>
      <SEO
        title="About ALC – All Logistics Cargo | 25+ Years in Global Trade"
        description="Learn about All Logistics Cargo's 25+ year journey from a traditional freight forwarder to a digital-first NVOCC and Export Trading Company."
      />

      {/* Hero */}
      <section className="relative bg-navy text-primary-foreground py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--ocean)/0.25),transparent_70%)]" />
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold tracking-widest uppercase text-ocean mb-4">About ALC</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              All Logistics Cargo
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-3xl mx-auto">
              For over 25 years, All Logistics Cargo has been the trusted partner for businesses seeking reliable, efficient, and cost-effective logistics solutions worldwide.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 max-w-3xl mx-auto">
              {[
                { stat: "25+", label: "Years Experience" },
                { stat: "500+", label: "Happy Clients" },
                { stat: "150+", label: "Countries Served" },
                { stat: "99.8%", label: "Success Rate" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-ocean">{s.stat}</p>
                  <p className="text-xs text-primary-foreground/50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Story</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Founded in 1996, All Logistics Cargo (ALC) has nearly three decades of trust in global trade.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We began as a traditional freight forwarder in Compton, California, founded by Michael Kuhfal. Today, we are a digital-first NVOCC and Export Trading Company, combining technology, logistics, and market entry support. Our mission is simple: help businesses enter new markets, provide end-to-end logistics solutions, and create growth opportunities beyond shipping.
            </p>
            <p className="text-foreground font-semibold text-lg">
              We don't just move goods. We unlock global opportunities.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* History Timeline */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-14 text-center">Our History</h2>
          </ScrollReveal>
          <div className="relative mt-14">
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-5 top-0 w-px bg-border/70 md:left-1/2 md:-translate-x-1/2"
            />
            <div className="flex flex-col gap-8 md:gap-12">
            {milestones.map((m, i) => {
              const isEven = i % 2 === 0;
              const Icon = m.icon;
              const card = (
                <div className="bg-gradient-to-br from-ocean to-ocean/80 rounded-2xl p-6 md:p-8 text-white shadow-lg w-full">
                  <p className="text-2xl md:text-3xl font-bold mb-1">{m.year}</p>
                  <h3 className="text-base md:text-lg font-bold mb-2">{m.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{m.desc}</p>
                </div>
              );
              return (
                <div key={m.year} className="relative">
                  <div className="flex items-start gap-4 md:hidden">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ocean/30 bg-background">
                      <Icon className="h-4 w-4 text-ocean" />
                    </div>
                    <div className="flex-1">{card}</div>
                  </div>

                  <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-8">
                    <div>{isEven ? card : null}</div>
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ocean/30 bg-background">
                      <Icon className="h-5 w-5 text-ocean" />
                    </div>
                    <div>{!isEven ? card : null}</div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ScrollReveal>
            <Rocket className="w-10 h-10 text-ocean mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
              To fix the fragmentation, inefficiency, and opacity in logistics by delivering simple, transparent, and technology-driven solutions that make global trade easier for every business.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-14 text-center">Core Values</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreValues.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.08}>
                <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <v.icon className="w-8 h-8 text-ocean mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{v.title}</h3>
                  <p className="text-muted-foreground text-sm">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">Meet the Leadership Team</h2>
            <p className="text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
              Meet the leadership team driving All Logistics Cargo forward with nearly three decades of trust in global trade.
            </p>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8">
            {leaders.map((l, i) => (
              <ScrollReveal key={l.name} delay={i * 0.1}>
                <div className="bg-card border border-border rounded-xl p-8">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-4">
                    <img src={l.img} alt={l.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{l.name}</h3>
                  <p className="text-sm text-ocean font-medium mb-3">{l.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{l.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-navy text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ScrollReveal>
            <Building2 className="w-10 h-10 text-ocean mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Partner with ALC?</h2>
            <p className="text-primary-foreground/60 mb-8">
              Join hundreds of satisfied clients who trust ALC for their logistics needs. Let's discuss how we can optimize your supply chain and drive your business forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="inline-flex items-center justify-center rounded-lg bg-ocean px-8 py-3 text-sm font-semibold text-white hover:bg-ocean/90 transition-colors">
                Start Partnership
              </a>
              <a href="/features" className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/20 px-8 py-3 text-sm font-semibold hover:bg-primary-foreground/5 transition-colors">
                Learn About Our Services
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact Info */}
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
