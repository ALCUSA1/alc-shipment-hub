import { ScrollReveal } from "@/components/motion/ScrollReveal";

const logos = [
  "Maersk", "CMA CGM", "Kuehne+Nagel", "DHL Global Forwarding", "Cargill", "COFCO", "DB Schenker", "Hapag-Lloyd", "Expeditors", "MSC",
];

export function TrustedBySection() {
  return (
    <section className="py-16 px-6 bg-background border-b border-border">
      <div className="container-narrow">
        <ScrollReveal>
          <p className="text-center text-sm font-medium text-muted-foreground mb-10 tracking-wide uppercase">
            Trusted by global trade leaders
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {logos.map((name) => (
              <div
                key={name}
                className="flex items-center justify-center h-10 px-6 rounded-md bg-muted/50 text-muted-foreground/60 text-sm font-semibold tracking-wide select-none grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
              >
                {name}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
