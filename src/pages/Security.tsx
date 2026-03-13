import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import {
  Server,
  Lock,
  ShieldCheck,
  FileSearch,
  Scale,
  AlertTriangle,
} from "lucide-react";

const sections = [
  {
    icon: Server,
    title: "Platform Infrastructure",
    body: "Our platform runs on enterprise-grade cloud infrastructure with automatic failover, geo-redundant backups, and 99.9% uptime SLA. All environments are isolated, and infrastructure is managed through code with continuous security scanning. Built on infrastructure that supports SOC2 Type II compliance.",
  },
  {
    icon: Lock,
    title: "Data Encryption",
    body: "All data in transit is protected with TLS 1.2+ encryption. Data at rest is encrypted using AES-256 standards. Database connections are secured with SSL certificates, and API traffic is routed through HTTPS-only endpoints. Encryption keys are managed using a dedicated key management service with automatic key rotation.",
  },
  {
    icon: ShieldCheck,
    title: "Access Control & Authentication",
    body: "The platform implements role-based access control (RBAC) with four primary roles — Admin, Operations, Finance, and Customer — ensuring that users only see data they are authorized to access. Authentication supports email/password, OAuth via Google, and optional SSO through SAML-based identity providers. Sessions are managed with secure, HttpOnly cookies and automatic token refresh.",
  },
  {
    icon: FileSearch,
    title: "Audit Logs",
    body: "Every significant action is recorded in an immutable audit log capturing the User ID, action performed, timestamp, previous value, and new value. Audited events include shipment edits, P&L modifications, compliance data updates, AES filing changes, and user permission modifications. Audit data is retained for a minimum of 12 months and is accessible to administrators through the platform's Audit Trail panel.",
  },
  {
    icon: Scale,
    title: "Compliance & Privacy",
    body: "User data is handled in accordance with GDPR data protection principles. Users can request account deletion, export their personal data, and update personal information at any time. Consent management and data minimization practices are applied across all data collection points. The platform does not sell or share user data with third parties.",
  },
  {
    icon: AlertTriangle,
    title: "Incident Response",
    body: "We maintain an incident response plan that includes automated alerting, defined escalation paths, and post-incident review processes. Critical issues such as payment failures, EDI processing errors, and stuck shipments trigger real-time alerts to the operations team. Security incidents are investigated promptly, and affected users are notified within 72 hours in accordance with regulatory requirements.",
  },
];

const Security = () => (
  <MarketingLayout>
    <SEO
      title="Security — ALC Shipper Portal"
      description="Enterprise-grade security architecture protecting customer data with encryption, RBAC, audit logging, and compliance-ready infrastructure."
      canonical="https://alcshipper.com/security"
    />

    {/* Hero */}
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <ScrollReveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
            Security &amp; Compliance
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Protecting your data at every layer
          </h1>
          <p className="text-lg text-primary-foreground/70">
            Our security architecture is designed to meet enterprise requirements
            — from encryption and access control to audit logging and incident
            response.
          </p>
        </ScrollReveal>
      </div>
    </section>

    {/* Detail sections */}
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-6 space-y-16">
        {sections.map((s, i) => (
          <ScrollReveal key={s.title} delay={i * 0.05}>
            <div className="flex gap-6">
              <div className="hidden sm:flex h-14 w-14 shrink-0 rounded-xl bg-accent/10 items-center justify-center">
                <s.icon className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {s.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>

    {/* Disclaimer */}
    <section className="py-12 bg-muted">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Our platform is built on infrastructure that supports SOC2 Type II
          compliance. Formal certification status is subject to independent
          verification. For questions regarding our security practices, please
          contact{" "}
          <a
            href="mailto:security@alcshipper.com"
            className="text-accent underline"
          >
            security@alcshipper.com
          </a>
          .
        </p>
      </div>
    </section>
  </MarketingLayout>
);

export default Security;
