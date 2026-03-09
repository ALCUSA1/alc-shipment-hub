import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { CategorySection } from "@/components/marketing/CategorySection";
import { BeforeAfterSection } from "@/components/marketing/BeforeAfterSection";
import { CTASection } from "@/components/marketing/CTASection";
import { SEO } from "@/components/SEO";

const Category = () => (
  <MarketingLayout>
    <SEO
      title="Shipper Logistics Workspace — A New Category"
      description="A new category of logistics software built from the shipper's perspective. See how ALC replaces scattered tools with one workspace."
      canonical="https://alcshipper.com/category"
    />
    <section className="section-padding bg-gray-light">
      <div className="container-narrow text-center">
        <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">Category</p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Shipper Logistics Workspace
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A new category of logistics software built from the shipper's perspective.
        </p>
      </div>
    </section>
    <CategorySection />
    <BeforeAfterSection />
    <CTASection />
  </MarketingLayout>
);

export default Category;
