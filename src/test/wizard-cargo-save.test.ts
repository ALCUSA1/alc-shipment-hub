import { describe, it, expect } from "vitest";
import { validateStep, cargoSchema } from "@/lib/wizard-validation";

describe("Wizard cargo validation", () => {
  const validCargo = {
    commodity: "Consumer Electronics",
    hsCode: "8471.30",
    numPackages: "150",
    packageType: "carton",
    grossWeight: "5000",
    volume: "25",
    unitValue: "250",
    totalValue: "37500",
    countryOfOrigin: "China",
    containerType: "40hc",
    containerQuantity: "2",
  };

  it("passes with valid cargo data", () => {
    const result = validateStep(cargoSchema, validCargo);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("fails when required fields are missing", () => {
    const result = validateStep(cargoSchema, {
      ...validCargo,
      commodity: "",
      containerType: "",
      grossWeight: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.commodity).toBeDefined();
    expect(result.errors.containerType).toBeDefined();
    expect(result.errors.grossWeight).toBeDefined();
  });

  it("fails on invalid HS code format", () => {
    const result = validateStep(cargoSchema, { ...validCargo, hsCode: "ABC" });
    expect(result.valid).toBe(false);
    expect(result.errors.hsCode).toContain("HS code format");
  });

  it("fails on non-positive container quantity", () => {
    const result = validateStep(cargoSchema, { ...validCargo, containerQuantity: "0" });
    expect(result.valid).toBe(false);
    expect(result.errors.containerQuantity).toBeDefined();
  });

  it("allows optional fields to be empty", () => {
    const minimal = {
      commodity: "Steel Pipes",
      hsCode: "",
      numPackages: "",
      packageType: "",
      grossWeight: "1000",
      volume: "",
      unitValue: "",
      totalValue: "",
      countryOfOrigin: "",
      containerType: "20gp",
      containerQuantity: "1",
    };
    const result = validateStep(cargoSchema, minimal);
    expect(result.valid).toBe(true);
  });
});

describe("Cargo-to-DB mapping", () => {
  it("transforms wizard cargo data to correct insert shape", () => {
    const cargo = {
      commodity: "Electronics",
      hsCode: "8471.30",
      numPackages: "150",
      packageType: "carton",
      grossWeight: "5000",
      volume: "25",
      unitValue: "250",
      totalValue: "37500",
      countryOfOrigin: "China",
      containerType: "40hc",
      containerQuantity: "2",
    };

    // Simulate the insert mapping from handleSubmit
    const cargoInsert = {
      shipment_id: "test-id",
      commodity: cargo.commodity || null,
      hs_code: cargo.hsCode || null,
      num_packages: cargo.numPackages ? parseInt(cargo.numPackages) : null,
      package_type: cargo.packageType || null,
      gross_weight: cargo.grossWeight ? parseFloat(cargo.grossWeight) : null,
      volume: cargo.volume ? parseFloat(cargo.volume) : null,
      country_of_origin: cargo.countryOfOrigin || null,
      total_value: cargo.totalValue ? parseFloat(cargo.totalValue) : null,
      unit_value: cargo.unitValue ? parseFloat(cargo.unitValue) : null,
    };

    expect(cargoInsert.commodity).toBe("Electronics");
    expect(cargoInsert.num_packages).toBe(150);
    expect(cargoInsert.gross_weight).toBe(5000);
    expect(cargoInsert.volume).toBe(25);
    expect(cargoInsert.total_value).toBe(37500);
    expect(cargoInsert.unit_value).toBe(250);

    const containerInsert = {
      shipment_id: "test-id",
      container_type: cargo.containerType,
      quantity: cargo.containerQuantity ? parseInt(cargo.containerQuantity) : 1,
    };

    expect(containerInsert.container_type).toBe("40hc");
    expect(containerInsert.quantity).toBe(2);

    const commodityInsert = {
      container_id: "container-test-id",
      shipment_id: "test-id",
      line_sequence: 1,
      commodity_description: cargo.commodity || null,
      hs_code: cargo.hsCode || null,
      gross_weight_kg: cargo.grossWeight ? parseFloat(cargo.grossWeight) : null,
      value_usd: cargo.totalValue ? parseFloat(cargo.totalValue) : null,
      country_of_manufacture: cargo.countryOfOrigin || null,
      quantity: cargo.numPackages ? parseFloat(cargo.numPackages) : null,
      hazardous: false,
    };

    expect(commodityInsert.commodity_description).toBe("Electronics");
    expect(commodityInsert.hs_code).toBe("8471.30");
    expect(commodityInsert.gross_weight_kg).toBe(5000);
    expect(commodityInsert.value_usd).toBe(37500);
    expect(commodityInsert.quantity).toBe(150);
  });
});
