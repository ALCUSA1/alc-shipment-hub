import { Wheat, Pill, Cpu, Shirt, Car, ShoppingCart, FlaskConical, Mountain } from "lucide-react";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const industries = [
  { icon: Wheat, title: "Agriculture", desc: "Bulk grain, fresh produce, and perishable goods across global trade lanes." },
  { icon: Pill, title: "Pharmaceuticals", desc: "Temperature-controlled shipments with compliance documentation." },
  { icon: Cpu, title: "Electronics", desc: "High-value cargo with secure handling and customs precision." },
  { icon: Shirt, title: "Textiles & Apparel", desc: "Fast-fashion supply chains with LCL and FCL flexibility." },
  { icon: Car, title: "Automotive", desc: "OEM parts, aftermarket, and oversized cargo coordination." },
  { icon: ShoppingCart, title: "FMCG", desc: "Consumer goods with tight delivery windows and retail compliance." },
  { icon: FlaskConical, title: "Chemicals", desc: "Hazmat-certified logistics with DG documentation support." },
  { icon: Mountain, title: "Mining & Minerals", desc: "Heavy-lift and bulk cargo with specialized equipment booking." },
];

export function IndustriesSection() {
  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Industries Served</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Purpose-built for every vertical.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            From agriculture to electronics, ALC supports the unique logistics requirements of every industry.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.06}>
          {industries.map((ind) => (
            <motion.div key={ind.title} variants={staggerItemVariants} className="bg-card rounded-2xl p-6 border hover:border-accent/30 transition-all duration-300 group text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <ind.icon className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{ind.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{ind.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
