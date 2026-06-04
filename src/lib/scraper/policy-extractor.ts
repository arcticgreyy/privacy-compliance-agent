import type { Page } from "playwright-core";
import type { PrivacyPolicyResult } from "./types";

const POLICY_LINK_PATTERNS = [
  /privacy/i,
  /cookie/i,
  /data\s*protection/i,
  /legal/i,
  /gdpr/i,
  /ccpa/i,
];

interface FoundLink {
  href: string;
  text: string;
  score: number;
}

export async function findPrivacyPolicyLink(
  page: Page,
  baseUrl: string
): Promise<string | null> {
  const links: FoundLink[] = await page.evaluate(
    ({ patterns }) => {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const results: { href: string; text: string; score: number }[] = [];

      for (const anchor of anchors) {
        const href = (anchor as HTMLAnchorElement).href;
        const text = anchor.textContent?.trim() ?? "";
        const combinedText = `${text} ${href}`.toLowerCase();

        let score = 0;
        for (const pattern of patterns) {
          if (new RegExp(pattern, "i").test(combinedText)) {
            score++;
          }
        }

        // Boost links with "privacy" in text (most likely the actual policy)
        if (/privacy\s*(policy|notice|statement)/i.test(text)) {
          score += 5;
        }

        if (score > 0) {
          results.push({ href, text, score });
        }
      }

      return results;
    },
    {
      patterns: POLICY_LINK_PATTERNS.map((p) => p.source),
    }
  );

  if (links.length === 0) return null;

  links.sort((a, b) => b.score - a.score);
  const best = links[0];

  try {
    const resolved = new URL(best.href, baseUrl);
    return resolved.href;
  } catch {
    return best.href;
  }
}

export async function extractPolicyText(
  page: Page,
  policyUrl: string
): Promise<PrivacyPolicyResult | null> {
  try {
    await page.goto(policyUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => {
      // Try to get the main content area first
      const mainSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".content",
        ".page-content",
        "#content",
        "#main-content",
      ];

      for (const selector of mainSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim();
        }
      }

      // Fall back to body text, stripping nav/header/footer
      const excludeSelectors = [
        "nav",
        "header",
        "footer",
        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]',
        ".nav",
        ".header",
        ".footer",
        ".sidebar",
      ];

      const body = document.body.cloneNode(true) as HTMLElement;
      for (const sel of excludeSelectors) {
        body.querySelectorAll(sel).forEach((el) => el.remove());
      }

      return body.textContent?.trim() ?? "";
    });

    if (text.length < 100) return null;

    // Cap at ~50k chars to stay within LLM context limits
    const truncated = text.length > 50_000 ? text.slice(0, 50_000) : text;

    return { url: policyUrl, text: truncated };
  } catch {
    return null;
  }
}
