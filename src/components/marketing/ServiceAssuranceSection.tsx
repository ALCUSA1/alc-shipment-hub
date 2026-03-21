import { ShieldCheck, FileCheck, Zap, Wallet } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const assurances = [
  { icon: ShieldCheck, title: "Verified Partners", desc: "Every freight forwarder, trucking company, and warehouse on the platform is vetted and FMC-licensed." },
  { icon: FileCheck, title: "Freight Contracts", desc: "Access negotiated contract rates from top carriers with guaranteed space and pricing." },
  { icon: Zap, title: "Instant Spot Booking", desc: "Book spot rates in real-time. No waiting for email quotes — get pricing and confirm in minutes." },
  { icon: Wallet, title: "Flexible Payments", desc: "Pay by wire, ACH, or credit card. Set up net-30 terms with approved partners." },
];

export function ServiceAssuranceSection() {
  return (
    <section className="section-padding bg-navy text-primary-foreground">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-electric mb-4 tracking-wide uppercase">ALC Assured</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Ship with confidence.
          </h2>
          <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-16 leading-relaxed">
            Every booking on ALC comes with built-in guarantees for reliability, transparency, and security.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 gap-6" staggerDelay={0.1}>
          {assurances.map((a, i) => (
            <motion.div key={i} variants={staggerItemVariants} className="p-6 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-electric/20 text-electric mb-4">
                <a.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-primary-foreground/60 leading-relaxed">{a.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
