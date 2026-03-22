/**
 * Static mapping of EDI message types to human-readable descriptions.
 * Used in Carrier Communications to translate raw codes into English statements.
 */

const EDI_TYPE_MAP: Record<string, { label: string; inbound: string; outbound: string }> = {
  IFTMIN: {
    label: "Booking Instruction",
    inbound: "Booking instruction received from carrier",
    outbound: "Booking instruction sent to carrier",
  },
  IFTMBC: {
    label: "Booking Confirmation",
    inbound: "Booking confirmed by carrier",
    outbound: "Booking confirmation request sent",
  },
  IFTSTA: {
    label: "Status Update",
    inbound: "Shipment status update received from carrier",
    outbound: "Status inquiry sent to carrier",
  },
  COPARN: {
    label: "Container Release",
    inbound: "Container release order received",
    outbound: "Container release order sent to terminal",
  },
  BAPLIE: {
    label: "Bay Plan",
    inbound: "Bay plan / stowage information received from vessel",
    outbound: "Bay plan submitted",
  },
  CUSCAR: {
    label: "Customs Cargo Declaration",
    inbound: "Customs cargo report received",
    outbound: "Customs cargo declaration submitted",
  },
  APERAK: {
    label: "Acknowledgement",
    inbound: "Acknowledgement received from carrier",
    outbound: "Acknowledgement sent to carrier",
  },
  DESADV: {
    label: "Despatch Advice",
    inbound: "Despatch advice received — cargo has been shipped",
    outbound: "Despatch advice sent to consignee",
  },
  VERMAS: {
    label: "VGM Declaration",
    inbound: "Verified gross mass confirmation received",
    outbound: "Verified gross mass (VGM) declaration submitted to carrier",
  },
  CODECO: {
    label: "Gate Move",
    inbound: "Container gate-in/gate-out notification received from terminal",
    outbound: "Gate move instruction sent",
  },
  COPINO: {
    label: "Container Pre-notification",
    inbound: "Container pre-notification received",
    outbound: "Container pre-notification sent to terminal",
  },
  MOVINS: {
    label: "Stowage Instruction",
    inbound: "Stowage instruction received",
    outbound: "Stowage instruction sent to vessel",
  },
  CALINF: {
    label: "Vessel Schedule",
    inbound: "Vessel call / schedule update received from carrier",
    outbound: "Vessel schedule inquiry sent",
  },
  INVOIC: {
    label: "Invoice",
    inbound: "Invoice received from carrier",
    outbound: "Invoice sent",
  },
  WASDIS: {
    label: "Cargo Manifest",
    inbound: "Cargo manifest received",
    outbound: "Cargo manifest submitted",
  },
};

export interface TranslatedEdiMessage {
  label: string;
  description: string;
  isKnown: boolean;
}

/**
 * Translate an EDI message type + direction into a human-readable description.
 * Returns `isKnown: false` when the code isn't in our static map (needs AI fallback).
 */
export function translateEdiMessage(
  messageType: string,
  direction: "inbound" | "outbound" | string,
  carrier?: string | null
): TranslatedEdiMessage {
  const key = messageType.toUpperCase().trim();
  const mapping = EDI_TYPE_MAP[key];

  if (mapping) {
    const dir = direction === "inbound" ? "inbound" : "outbound";
    const desc = carrier
      ? `${mapping[dir]} (${carrier})`
      : mapping[dir];
    return { label: mapping.label, description: desc, isKnown: true };
  }

  // Fallback: format the raw code nicely
  return {
    label: messageType,
    description: `${direction === "inbound" ? "Received" : "Sent"}: ${messageType}${carrier ? ` via ${carrier}` : ""}`,
    isKnown: false,
  };
}
