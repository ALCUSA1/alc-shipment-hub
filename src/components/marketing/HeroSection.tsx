import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Globe } from "lucide-react";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-light">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1200 800">
          <path d="M100,400 Q300,200 500,350 T900,300" fill="none" stroke="hsl(213,67%,14%)" strokeWidth="1.5" />
          <path d="M50,500 Q250,350 450,450 T850,400" fill="none" stroke="hsl(217,95%,58%)" strokeWidth="1" />
          <path d="M200,300 Q400,150 600,280 T1000,250" fill="none" stroke="hsl(213,67%,14%)" strokeWidth="1" />
          <circle cx="150" cy="400" r="3" fill="hsl(217,95%,58%)" opacity="0.4" />
          <circle cx="500" cy="350" r="3" fill="hsl(217,95%,58%)" opacity="0.4" />
          <circle cx="850" cy="300" r="3" fill="hsl(217,95%,58%)" opacity="0.4" />
          <circle cx="300" cy="500" r="2" fill="hsl(213,67%,14%)" opacity="0.3" />
          <circle cx="700" cy="250" r="2" fill="hsl(213,67%,14%)" opacity="0.3" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8"
        >
          <Globe className="h-4 w-4" />
          Shipment Coordination Workspace
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground mb-6"
        >
          Coordinate freight, trucking,
          <br />
          <span className="text-gradient">and warehouses in one workspace.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10"
        >
          ALC Shipper Portal is the Shipment Coordination Workspace where shippers, freight forwarders, trucking companies, warehouses, and shipping lines collaborate on every shipment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="electric" size="lg" className="text-base px-8 h-12" asChild>
            <Link to="/signup">
              Start Shipping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
