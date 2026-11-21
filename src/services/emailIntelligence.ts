import dns from "dns/promises";
import { md5Hex } from "@/lib/security/tokens";
import type { EmailFinding } from "@/types";

/**
 * Email Digital Footprint checker.
 *
 * STRICTLY uses publicly available / consented data sources:
 *   - DNS MX records (public) to identify the mail provider.
 *   - Gravatar public avatar presence (public API, no auth).
 *   - Have I Been Pwned breach data (requires your own authorized API key).
 *
 * It deliberately performs NO account enumeration, NO login probing,
 * NO password-reset probing, and NO access to private account data.
 * When something cannot be verified it is reported as "not_verified".
 */

const PROVIDER_HINTS: { match: RegExp; name: string }[] = [
  { match: /google|gmail|googlemail/i, name: "Google Workspace / Gmail" },
  { match: /outlook|hotmail|microsoft|office365/i, name: "Microsoft 365 / Outlook" },
  { match: /zoho/i, name: "Zoho Mail" },
  { match: /yahoo|yahoodns/i, name: "Yahoo Mail" },
  { match: /protonmail|proton\.me/i, name: "Proton Mail" },
  { match: /icloud|apple/i, name: "Apple iCloud Mail" },
  { match: /amazonaws|amazonses/i, name: "Amazon SES" },
  { match: /pphosted|proofpoint/i, name: "Proofpoint" },
  { match: /mimecast/i, name: "Mimecast" },
];

async function lookupMxProvider(domain: string): Promise<EmailFinding | null> {
  try {
    const records = await dns.resolveMx(domain);
    if (!records.length) {
      return {
        category: "Mail provider",
        source: "DNS MX records (public)",
        detail: "No MX records found — domain may not receive email.",
        confidence: "low",
      };
    }
    records.sort((a, b) => a.priority - b.priority);
    const primary = records[0]!.exchange;
    const hint = PROVIDER_HINTS.find((p) => p.match.test(primary));
    return {
      category: "Mail provider",
      source: "DNS MX records (public)",
      detail: hint
        ? `${hint.name} (primary MX: ${primary})`
        : `Primary MX host: ${primary}`,
      confidence: hint ? "high" : "medium",
    };
  } catch {
    return {
      category: "Mail provider",
      source: "DNS MX records (public)",
      detail: "Could not resolve MX records for this domain.",
      confidence: "not_verified",
    };
  }
}

async function lookupGravatar(email: string): Promise<EmailFinding> {
  const hash = md5Hex(email.trim().toLowerCase());
  const url = `https://www.gravatar.com/avatar/${hash}?d=404`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      return {
        category: "Public profile",
        source: "Gravatar (public avatar API)",
        detail: `A public Gravatar avatar exists for this address: https://www.gravatar.com/avatar/${hash}`,
        confidence: "high",
      };
    }
    return {
      category: "Public profile",
      source: "Gravatar (public avatar API)",
      detail: "No public Gravatar avatar is associated with this address.",
      confidence: "medium",
    };
  } catch {
    return {
      category: "Public profile",
      source: "Gravatar (public avatar API)",
      detail: "Gravatar lookup could not be completed.",
      confidence: "not_verified",
    };
  }
}

async function lookupBreaches(email: string): Promise<EmailFinding> {
  const key = process.env.HIBP_API_KEY;
  if (!key) {
    return {
      category: "Breach exposure",
      source: "Have I Been Pwned",
      detail:
        "Not verified — set HIBP_API_KEY in .env to enable authorized breach lookups.",
      confidence: "not_verified",
    };
  }
  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(
        email
      )}?truncateResponse=true`,
      {
        headers: {
          "hibp-api-key": key,
          "user-agent": "LinkTrack-EmailIntelligence",
        },
      }
    );
    if (res.status === 404) {
      return {
        category: "Breach exposure",
        source: "Have I Been Pwned",
        detail: "No known breaches found for this address.",
        confidence: "high",
      };
    }
    if (!res.ok) {
      return {
        category: "Breach exposure",
        source: "Have I Been Pwned",
        detail: `Not verified — API returned status ${res.status}.`,
        confidence: "not_verified",
      };
    }
    const data = (await res.json()) as { Name: string }[];
    const names = data.map((b) => b.Name).slice(0, 25);
    return {
      category: "Breach exposure",
      source: "Have I Been Pwned",
      detail: `Found in ${data.length} known breach(es): ${names.join(", ")}`,
      confidence: "high",
    };
  } catch {
    return {
      category: "Breach exposure",
      source: "Have I Been Pwned",
      detail: "Not verified — breach lookup could not be completed.",
      confidence: "not_verified",
    };
  }
}

export async function investigateEmail(email: string): Promise<{
  domain: string;
  findings: EmailFinding[];
}> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  const [mx, gravatar, breaches] = await Promise.all([
    lookupMxProvider(domain),
    lookupGravatar(email),
    lookupBreaches(email),
  ]);

  const findings: EmailFinding[] = [];
  findings.push({
    category: "Domain",
    source: "Parsed from address",
    detail: `Email domain: ${domain}`,
    confidence: "high",
  });
  if (mx) findings.push(mx);
  findings.push(gravatar);
  findings.push(breaches);

  return { domain, findings };
}
