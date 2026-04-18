import { supabase } from "@/integrations/supabase/client";

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

const FALLBACK_BLOCKED = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
  "aol.com", "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "gmx.com", "gmx.net", "gmx.de", "mail.com",
  "yandex.com", "yandex.ru", "zoho.com", "tutanota.com", "tuta.io",
  "fastmail.com", "hey.com",
  "qq.com", "163.com", "126.com", "sina.com",
  "naver.com", "hanmail.net", "daum.net",
  "web.de", "t-online.de", "free.fr", "orange.fr", "laposte.net", "libero.it",
  "hushmail.com", "inbox.com", "rediffmail.com",
  "btinternet.com", "sbcglobal.net", "comcast.net", "verizon.net", "cox.net", "att.net",
  "mail.ru", "bk.ru", "list.ru",
]);

export async function getBlockedDomains(): Promise<Set<string>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("blocked_email_domains")
        .select("domain");
      if (error || !data) {
        cache = FALLBACK_BLOCKED;
      } else {
        cache = new Set(data.map((r) => r.domain.toLowerCase()));
      }
    } catch {
      cache = FALLBACK_BLOCKED;
    }
    return cache!;
  })();
  return inflight;
}

export async function validateBusinessEmail(
  email: string
): Promise<{ valid: boolean; reason?: string }> {
  const trimmed = (email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email address." };
  }
  const domain = trimmed.split("@")[1];
  const blocked = await getBlockedDomains();
  if (blocked.has(domain)) {
    return {
      valid: false,
      reason:
        "Please use your business email address. Free email providers (e.g. gmail.com, hotmail.com, outlook.com) are not accepted.",
    };
  }
  return { valid: true };
}
