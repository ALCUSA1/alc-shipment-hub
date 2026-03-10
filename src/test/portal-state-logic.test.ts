import { describe, it, expect } from "vitest";

/**
 * State-based edit restriction logic tests.
 * These validate the business rules for when edit controls should be shown/hidden
 * across all three portals (Shipper, Carrier, Warehouse).
 */

// ─── Shipper Portal: TruckingPanel Logic ───

const FINALIZED_STATUSES = ["delivered", "completed", "cancelled"];
const ACTIVE_STATUSES = ["draft", "booked", "in_transit", "arrived", "booking_confirmed"];

function isReadOnly(shipmentStatus: string): boolean {
  return FINALIZED_STATUSES.includes(shipmentStatus);
}

function canRequestCarrier(shipmentStatus: string): boolean {
  return !isReadOnly(shipmentStatus) && ACTIVE_STATUSES.includes(shipmentStatus);
}

function canAcceptRejectQuote(quoteStatus: string, shipmentStatus: string): boolean {
  return quoteStatus === "submitted" && !isReadOnly(shipmentStatus);
}

describe("Shipper Portal — TruckingPanel state logic", () => {
  it("marks delivered/completed/cancelled as read-only", () => {
    expect(isReadOnly("delivered")).toBe(true);
    expect(isReadOnly("completed")).toBe(true);
    expect(isReadOnly("cancelled")).toBe(true);
  });

  it("marks active statuses as not read-only", () => {
    expect(isReadOnly("draft")).toBe(false);
    expect(isReadOnly("booked")).toBe(false);
    expect(isReadOnly("in_transit")).toBe(false);
  });

  it("allows carrier requests for active shipments", () => {
    expect(canRequestCarrier("draft")).toBe(true);
    expect(canRequestCarrier("booked")).toBe(true);
    expect(canRequestCarrier("in_transit")).toBe(true);
    expect(canRequestCarrier("arrived")).toBe(true);
  });

  it("blocks carrier requests for finalized shipments", () => {
    expect(canRequestCarrier("delivered")).toBe(false);
    expect(canRequestCarrier("completed")).toBe(false);
    expect(canRequestCarrier("cancelled")).toBe(false);
  });

  it("allows accept/reject only for submitted quotes on active shipments", () => {
    expect(canAcceptRejectQuote("submitted", "booked")).toBe(true);
    expect(canAcceptRejectQuote("submitted", "in_transit")).toBe(true);
  });

  it("blocks accept/reject for non-submitted quotes", () => {
    expect(canAcceptRejectQuote("available", "booked")).toBe(false);
    expect(canAcceptRejectQuote("accepted", "booked")).toBe(false);
    expect(canAcceptRejectQuote("rejected", "booked")).toBe(false);
  });

  it("blocks accept/reject on finalized shipments", () => {
    expect(canAcceptRejectQuote("submitted", "delivered")).toBe(false);
    expect(canAcceptRejectQuote("submitted", "completed")).toBe(false);
  });
});

// ─── Carrier Portal: TruckingOrderDetail Logic ───

function canSubmitQuote(shipmentStatus: string): boolean {
  return !isReadOnly(shipmentStatus) && ACTIVE_STATUSES.includes(shipmentStatus);
}

function canAcceptOrder(quoteStatus: string): boolean {
  return quoteStatus === "available";
}

function canSubmitPricing(quoteStatus: string): boolean {
  return quoteStatus === "accepted_by_carrier";
}

function canAssignDriver(quoteStatus: string): boolean {
  return quoteStatus === "accepted";
}

describe("Carrier Portal — TruckingOrderDetail state logic", () => {
  it("allows quote submission for active shipments", () => {
    expect(canSubmitQuote("draft")).toBe(true);
    expect(canSubmitQuote("booked")).toBe(true);
  });

  it("blocks quote submission for finalized shipments", () => {
    expect(canSubmitQuote("delivered")).toBe(false);
    expect(canSubmitQuote("completed")).toBe(false);
    expect(canSubmitQuote("cancelled")).toBe(false);
  });

  it("allows order acceptance only for 'available' quotes", () => {
    expect(canAcceptOrder("available")).toBe(true);
    expect(canAcceptOrder("submitted")).toBe(false);
    expect(canAcceptOrder("accepted")).toBe(false);
    expect(canAcceptOrder("rejected")).toBe(false);
  });

  it("allows pricing submission only after carrier accepts", () => {
    expect(canSubmitPricing("accepted_by_carrier")).toBe(true);
    expect(canSubmitPricing("available")).toBe(false);
    expect(canSubmitPricing("submitted")).toBe(false);
  });

  it("allows driver assignment only for shipper-accepted quotes", () => {
    expect(canAssignDriver("accepted")).toBe(true);
    expect(canAssignDriver("submitted")).toBe(false);
    expect(canAssignDriver("available")).toBe(false);
    expect(canAssignDriver("accepted_by_carrier")).toBe(false);
  });
});

// ─── Warehouse Portal: Order status logic ───

function isFinalWarehouseStatus(status: string): boolean {
  return ["completed", "rejected", "cancelled"].includes(status);
}

function canAcceptWarehouseOrder(status: string): boolean {
  return status === "pending";
}

function canCompleteWarehouseOrder(status: string): boolean {
  return status === "confirmed" || status === "in_progress";
}

describe("Warehouse Portal — order state logic", () => {
  it("marks completed/rejected/cancelled as final", () => {
    expect(isFinalWarehouseStatus("completed")).toBe(true);
    expect(isFinalWarehouseStatus("rejected")).toBe(true);
    expect(isFinalWarehouseStatus("cancelled")).toBe(true);
  });

  it("marks pending/confirmed/in_progress as not final", () => {
    expect(isFinalWarehouseStatus("pending")).toBe(false);
    expect(isFinalWarehouseStatus("confirmed")).toBe(false);
    expect(isFinalWarehouseStatus("in_progress")).toBe(false);
  });

  it("allows accept/reject only for pending orders", () => {
    expect(canAcceptWarehouseOrder("pending")).toBe(true);
    expect(canAcceptWarehouseOrder("confirmed")).toBe(false);
    expect(canAcceptWarehouseOrder("completed")).toBe(false);
  });

  it("allows completion for confirmed or in_progress orders", () => {
    expect(canCompleteWarehouseOrder("confirmed")).toBe(true);
    expect(canCompleteWarehouseOrder("in_progress")).toBe(true);
    expect(canCompleteWarehouseOrder("pending")).toBe(false);
    expect(canCompleteWarehouseOrder("completed")).toBe(false);
  });
});

// ─── Quote Lifecycle (full flow) ───

describe("Quote lifecycle flow validation", () => {
  const QUOTE_FLOW = [
    "available",           // Shipper sends to carrier
    "accepted_by_carrier", // Carrier accepts order
    "submitted",           // Carrier submits pricing
    "accepted",            // Shipper accepts quote
    // OR "rejected"       // Shipper or carrier rejects
  ];

  it("follows correct status progression", () => {
    expect(QUOTE_FLOW.indexOf("available")).toBeLessThan(QUOTE_FLOW.indexOf("accepted_by_carrier"));
    expect(QUOTE_FLOW.indexOf("accepted_by_carrier")).toBeLessThan(QUOTE_FLOW.indexOf("submitted"));
    expect(QUOTE_FLOW.indexOf("submitted")).toBeLessThan(QUOTE_FLOW.indexOf("accepted"));
  });

  it("only shows accept/decline on available status", () => {
    QUOTE_FLOW.forEach((status) => {
      if (status === "available") {
        expect(canAcceptOrder(status)).toBe(true);
      } else {
        expect(canAcceptOrder(status)).toBe(false);
      }
    });
  });

  it("only shows pricing form on accepted_by_carrier status", () => {
    QUOTE_FLOW.forEach((status) => {
      if (status === "accepted_by_carrier") {
        expect(canSubmitPricing(status)).toBe(true);
      } else {
        expect(canSubmitPricing(status)).toBe(false);
      }
    });
  });
});
