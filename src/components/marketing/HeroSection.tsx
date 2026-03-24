import { Button } from "@/components/ui/button";
import { Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { HeroRateSearch } from "./HeroRateSearch";
import { StartShipmentModal } from "./StartShipmentModal";
import { DemoModal } from "./DemoModal";

export function HeroSection() {
  const [showSignup, setShowSignup] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-light">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1200 800">
          <path d="M100,400 Q300,200 500,350 T900,300" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          <path d="M50,500 Q250,350 450,450 T850,400" fill="none" stroke="hsl(var(--accent))" strokeWidth="1" />
          <path d="M200,300 Q400,150 600,280 T1000,250" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
          <circle cx="150" cy="400" r="3" fill="hsl(var(--accent))" opacity="0.4" />
          <circle cx="500" cy="350" r="3" fill="hsl(var(--accent))" opacity="0.4" />
          <circle cx="850" cy="300" r="3" fill="hsl(var(--accent))" opacity="0.4" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-36 pb-16 md:pb-24">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8"
          >
            <Globe className="h-4 w-4" />
            Logistics Operating System
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-center"
          >
            Price, manage, and profit
            <br />
            <span className="text-gradient">from every shipment in one platform.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-8"
          >
            Turn carrier rates into profitable quotes, coordinate execution, and track margins — without spreadsheets, emails, or disconnected tools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <Button variant="electric" size="lg" className="text-base px-8 h-12" onClick={() => setShowSignup(true)}>
              Start a Shipment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12" onClick={() => setShowDemo(true)}>
              Book a Demo
            </Button>
          </motion.div>
        </div>

        {/* Rate Search */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mb-4"
        >
          Get live carrier rates and instantly see your profit before quoting
        </motion.p>

        <HeroRateSearch />
      </div>

      <StartShipmentModal open={showSignup} onOpenChange={setShowSignup} />
      <DemoModal open={showDemo} onOpenChange={setShowDemo} />
    </section>
  );
}
