import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Star } from "lucide-react";

const row1 = [
  { name: "Maersk", logo: "https://logo.clearbit.com/maersk.com" },
  { name: "CMA CGM", logo: "https://logo.clearbit.com/cma-cgm.com" },
  { name: "Kuehne+Nagel", logo: "https://logo.clearbit.com/kuehne-nagel.com" },
  { name: "DHL Global Forwarding", logo: "https://logo.clearbit.com/dhl.com" },
  { name: "Cargill", logo: "https://logo.clearbit.com/cargill.com" },
];

const row2 = [
  { name: "COFCO", logo: "https://logo.clearbit.com/cofcointernational.com" },
  { name: "DB Schenker", logo: "https://logo.clearbit.com/dbschenker.com" },
  { name: "Hapag-Lloyd", logo: "https://logo.clearbit.com/hapag-lloyd.com" },
  { name: "Expeditors", logo: "https://logo.clearbit.com/expeditors.com" },
  { name: "MSC", logo: "https://logo.clearbit.com/msc.com" },
];

function MarqueeRow({ items, reverse = false }: { items: typeof row1; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="group relative flex overflow-hidden py-3"
      style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
    >
      <div
        className={`flex shrink-0 gap-6 ${reverse ? "animate-scroll-reverse" : "animate-scroll"} group-hover:[animation-play-state:paused]`}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <img
              src={item.logo}
              alt={item.name}
              className="h-6 w-6 object-contain grayscale transition-all duration-300 group-hover:grayscale-0 md:h-8 md:w-8"
              loading="lazy"
            />
            <span className="whitespace-nowrap text-xs font-semibold text-white/60 transition-colors duration-300 hover:text-white/90 md:text-sm">
              {item.name}
            </span>
          </div>
        ))}
      </div>
      <div
        className={`flex shrink-0 gap-6 ${reverse ? "animate-scroll-reverse" : "animate-scroll"} group-hover:[animation-play-state:paused]`}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.name}-dup-${i}`}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <img
              src={item.logo}
              alt={item.name}
              className="h-6 w-6 object-contain grayscale transition-all duration-300 group-hover:grayscale-0 md:h-8 md:w-8"
              loading="lazy"
            />
            <span className="whitespace-nowrap text-xs font-semibold text-white/60 transition-colors duration-300 hover:text-white/90 md:text-sm">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustedBySection() {
  return (
    <section className="relative py-20 px-6 overflow-hidden bg-[hsl(220,20%,8%)]">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(217,95%,58%,0.06),transparent_70%)]" />

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
                Industry Partners
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              Trusted by global trade leaders
            </h3>
            <p className="text-sm text-white/50 mt-3 max-w-lg mx-auto">
              Ship with the world's leading carriers and commodity traders — all through one platform
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-2">
          <MarqueeRow items={row1} />
          <MarqueeRow items={row2} reverse />
        </div>
      </div>

      {/* Top/bottom border gradients */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
    </section>
  );
}
