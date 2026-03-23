import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const logos = [
  { name: "Maersk", initials: "MK" },
  { name: "CMA CGM", initials: "CC" },
  { name: "Kuehne+Nagel", initials: "KN" },
  { name: "DHL Global Forwarding", initials: "DHL" },
  { name: "Cargill", initials: "CG" },
  { name: "COFCO", initials: "CO" },
  { name: "DB Schenker", initials: "DBS" },
  { name: "Hapag-Lloyd", initials: "HL" },
  { name: "Expeditors", initials: "EX" },
  { name: "MSC", initials: "MSC" },
];

export function TrustedBySection() {
  return (
    <section className="relative py-20 px-6 overflow-hidden bg-background">
      {/* Decorative top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="container-narrow relative z-10">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
                Industry Partners
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Trusted by global trade leaders
            </h3>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              Powering logistics for the world's leading shipping, freight, and supply-chain companies
            </p>
          </div>
        </ScrollReveal>

        {/* Logo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {logos.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="group relative"
            >
              <div className="relative flex flex-col items-center justify-center h-24 rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-shadow duration-500 hover:shadow-xl hover:shadow-accent/10 hover:border-accent/30">
                {/* Accent glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:to-transparent transition-all duration-500" />

                {/* Initials badge */}
                <div className="relative w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors duration-300">
                  <span className="text-xs font-black text-accent tracking-tight">{logo.initials}</span>
                </div>

                <span className="relative text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-center px-2 leading-tight">
                  {logo.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative bottom border gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </section>
  );
}
