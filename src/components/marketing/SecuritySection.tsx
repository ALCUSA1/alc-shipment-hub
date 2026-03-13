import { Shield, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

const pillars = [
  {
    icon: ShieldCheck,
    title: "SOC2 Type II Ready",
    description:
      "The platform is built using infrastructure providers that maintain SOC2 Type II compliance. Data is stored on secure cloud infrastructure with strict access controls and audit logging.",
  },
  {
    icon: Shield,
    title: "GDPR Data Protection",
    description:
      "User data is handled according to GDPR data protection principles including consent management, data minimization, and user data access/deletion controls.",
  },
  {
    icon: KeyRound,
    title: "Single Sign-On (SSO)",
    description:
      "Support enterprise authentication through SSO providers such as Google Workspace, Microsoft Azure AD, and SAML-based identity providers.",
  },
  {
    icon: Lock,
    title: "Data Encryption",
    description:
      "All sensitive data is encrypted both in transit and at rest using industry-standard encryption protocols (TLS 1.2+ and AES-256).",
  },
];

export function SecuritySection() {
  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
              Security
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built on strong foundations
            </h2>
            <p className="max-w-2xl mx-auto text-primary-foreground/70 text-lg">
              Our platform is designed with enterprise-grade security to protect
              customer data. We leverage industry best practices including
              encryption, role-based access controls, secure authentication, and
              privacy protections.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {pillars.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.1}>
              <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 h-full flex flex-col">
                <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                  <p.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-primary-foreground/60 leading-relaxed flex-1">
                  {p.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="text-center">
          <Button
            variant="outline"
            className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <Link to="/security">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
