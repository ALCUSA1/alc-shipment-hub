import { X, Check } from "lucide-react";

const before = [
  "Shipping coordination happens through email threads, spreadsheets, and document attachments.",
  "Shipment details are repeated multiple times.",
  "Important documents get lost.",
  "Shipment updates arrive from different systems.",
];

const after = [
  "Shipment data is entered once.",
  "Documents are automatically generated.",
  "Freight quotes are managed in the workspace.",
  "Shipment progress is tracked in one place.",
  "Teams operate from a single source of truth.",
];

export function BeforeAfterSection() {
  return (
    <section className="section-padding bg-gray-light">
      <div className="container-narrow">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-16 text-center leading-tight">
          A better way to ship.
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card rounded-2xl p-8 border">
            <span className="inline-block px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-6">Today</span>
            <ul className="space-y-4">
              {before.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-accent/20 shadow-lg shadow-accent/5">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-6">With ALC Shipper Portal</span>
            <ul className="space-y-4">
              {after.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
