import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const logos = [
  { name: "Maersk", accent: "from-[hsl(210,80%,55%)] to-[hsl(210,60%,40%)]" },
  { name: "CMA CGM", accent: "from-[hsl(345,70%,50%)] to-[hsl(345,50%,35%)]" },
  { name: "Kuehne+Nagel", accent: "from-[hsl(210,60%,45%)] to-[hsl(210,40%,30%)]" },
  { name: "DHL Global Forwarding", accent: "from-[hsl(45,90%,50%)] to-[hsl(30,80%,45%)]" },
  { name: "Cargill", accent: "from-[hsl(145,50%,40%)] to-[hsl(145,40%,28%)]" },
  { name: "COFCO", accent: "from-[hsl(0,65%,50%)] to-[hsl(0,50%,35%)]" },
  { name: "DB Schenker", accent: "from-[hsl(0,70%,48%)] to-[hsl(350,55%,35%)]" },
  { name: "Hapag-Lloyd", accent: "from-[hsl(25,85%,52%)] to-[hsl(15,70%,40%)]" },
  { name: "Expeditors", accent: "from-[hsl(210,50%,45%)] to-[hsl(200,40%,32%)]" },
  { name: "MSC", accent: "from-[hsl(220,70%,50%)] to-[hsl(220,55%,35%)]" },
];

export function TrustedBySection() {
  return (
    <section className="relative py-20 px-6 overflow-hidden bg-[hsl(220,25%,6%)]">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(210,60%,20%,0.15),transparent)]" />

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent/70 mb-3">
              Industry Partners
            </p>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Trusted by global trade leaders
            </h3>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {logos.map((logo, i) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="group relative"
              >
                <div className="relative flex items-center justify-center h-16 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-accent/5">
                  {/* Gradient bar on hover */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${logo.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <span className="text-[13px] font-semibold text-white/40 group-hover:text-white/90 transition-colors duration-500 tracking-wide text-center px-3 leading-tight">
                    {logo.name}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>

        {/* Subtle separator line */}
        <div className="mt-14 flex justify-center">
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
    </section>
  );
}
