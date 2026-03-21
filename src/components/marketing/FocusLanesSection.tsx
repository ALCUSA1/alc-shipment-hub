import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal, StaggerContainer, staggerItemVariants } from "@/components/motion/ScrollReveal";
import { motion } from "framer-motion";

const lanes = [
  { origin: "🇨🇳 Shanghai", destination: "🇺🇸 Los Angeles", tag: "FCL · 14-18 days", originCode: "CNSGH", destCode: "USLAX" },
  { origin: "🇨🇳 Shenzhen", destination: "🇳🇱 Rotterdam", tag: "FCL · 28-32 days", originCode: "CNSZX", destCode: "NLRTM" },
  { origin: "🇰🇷 Busan", destination: "🇺🇸 Long Beach", tag: "FCL · 12-16 days", originCode: "KRPUS", destCode: "USLGB" },
  { origin: "🇻🇳 Ho Chi Minh", destination: "🇬🇧 Felixstowe", tag: "FCL · 26-30 days", originCode: "VNSGN", destCode: "GBFXT" },
  { origin: "🇩🇪 Hamburg", destination: "🇺🇸 New York", tag: "FCL · 10-14 days", originCode: "DEHAM", destCode: "USNYC" },
  { origin: "🇸🇬 Singapore", destination: "🇦🇺 Sydney", tag: "FCL · 12-15 days", originCode: "SGSIN", destCode: "AUSYD" },
];

export function FocusLanesSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container-narrow">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Popular Routes</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Top trade lanes, ready to quote.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            Get competitive rates on the world's busiest shipping corridors.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {lanes.map((lane) => (
            <motion.div key={lane.originCode + lane.destCode} variants={staggerItemVariants}>
              <Link
                to={`/rates?origin=${lane.originCode}&destination=${lane.destCode}&mode=ocean`}
                className="block bg-card rounded-2xl p-6 border hover:border-accent/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm font-semibold text-foreground">{lane.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{lane.destination}</span>
                </div>
                <span className="text-xs text-muted-foreground">{lane.tag}</span>
                <p className="text-xs font-medium text-accent mt-3 group-hover:underline">Search rates →</p>
              </Link>
            </motion.div>
          ))}
        </StaggerContainer>

        <ScrollReveal delay={0.2} className="text-center mt-12">
          <Button variant="electric" size="lg" asChild>
            <Link to="/rates">Explore All Routes <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
