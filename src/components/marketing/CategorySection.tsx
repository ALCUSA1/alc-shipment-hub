import { Compass } from "lucide-react";

export function CategorySection() {
  return (
    <section className="section-padding bg-navy text-primary-foreground">
      <div className="container-narrow text-center">
        <Compass className="h-10 w-10 text-electric mx-auto mb-6" />
        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
          Introducing the Shipper Logistics Workspace.
        </h2>
        <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto mb-8 leading-relaxed">
          A centralized platform where exporters and importers manage shipment requests, freight quotes, shipping instructions, and shipment tracking in one digital workspace.
        </p>
        <p className="text-base text-primary-foreground/50 max-w-xl mx-auto leading-relaxed">
          Instead of coordinating logistics through fragmented communication channels, businesses operate from a structured logistics environment. This becomes the control center for global shipping operations.
        </p>
      </div>
    </section>
  );
}
