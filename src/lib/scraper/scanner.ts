import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { setupRequestCapture, identifyTags } from "./request-capture";
import { findPrivacyPolicyLink, extractPolicyText } from "./policy-extractor";
import type { ScanResult } from "./types";

export interface ScannerOptions {
  browserWSEndpoint?: string;
  executablePath?: string;
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

const DEFAULT_OPTIONS: Required<ScannerOptions> = {
  browserWSEndpoint: "",
  executablePath: "",
  headless: true,
  timeout: 60_000,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function launchBrowser(options: ScannerOptions): Promise<Browser> {
  if (options.browserWSEndpoint) {
    return chromium.connect(options.browserWSEndpoint);
  }

  return chromium.launch({
    headless: options.headless ?? true,
    executablePath: options.executablePath || undefined,
  });
}

export async function scanWebsite(
  targetDomain: string,
  options: ScannerOptions = {}
): Promise<ScanResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  const targetUrl = targetDomain.startsWith("http")
    ? targetDomain
    : `https://${targetDomain}`;

  let siteHostname: string;
  try {
    siteHostname = new URL(targetUrl).hostname;
  } catch {
    throw new Error(`Invalid target URL: ${targetUrl}`);
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await launchBrowser(opts);
    context = await browser.newContext({
      userAgent: opts.userAgent,
      viewport: { width: 1920, height: 1080 },
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeout);

    // Set up network interception
    const { allRequests, thirdPartyRequests } = setupRequestCapture(
      page,
      siteHostname
    );

    // Navigate to homepage and wait for network activity to settle
    try {
      await page.goto(targetUrl, {
        waitUntil: "networkidle",
        timeout: opts.timeout,
      });
    } catch (err) {
      // networkidle can time out on heavy sites — continue with what we have
      errors.push(
        `Navigation warning: ${err instanceof Error ? err.message : "timeout"}`
      );
    }

    // Give extra time for lazy-loaded trackers
    await page.waitForTimeout(3000);

    // Scroll to trigger lazy-loaded scripts
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Identify known vendor tags
    const identifiedTags = identifyTags(thirdPartyRequests);

    // Find and extract privacy policy
    let privacyPolicy = null;
    const policyUrl = await findPrivacyPolicyLink(page, targetUrl);
    if (policyUrl) {
      privacyPolicy = await extractPolicyText(page, policyUrl);
      if (!privacyPolicy) {
        errors.push(`Found policy link (${policyUrl}) but failed to extract text`);
      }
    } else {
      errors.push("No privacy policy link found on the homepage");
    }

    const completedAt = new Date().toISOString();

    return {
      targetUrl,
      allRequests,
      thirdPartyRequests,
      identifiedTags,
      privacyPolicy,
      errors,
      timing: {
        startedAt,
        completedAt,
        durationMs:
          new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      },
    };
  } finally {
    await context?.close();
    await browser?.close();
  }
}
