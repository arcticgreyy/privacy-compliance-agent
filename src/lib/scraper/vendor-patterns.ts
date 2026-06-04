export interface VendorPattern {
  name: string;
  hostnames: string[];
  category: string;
}

export const KNOWN_VENDORS: VendorPattern[] = [
  {
    name: "Google Analytics",
    hostnames: ["google-analytics.com", "analytics.google.com", "www.googletagmanager.com"],
    category: "Analytics",
  },
  {
    name: "Google Ads",
    hostnames: ["googleads.g.doubleclick.net", "www.googleadservices.com", "pagead2.googlesyndication.com"],
    category: "Advertising",
  },
  {
    name: "Meta Pixel",
    hostnames: ["connect.facebook.net", "www.facebook.com", "pixel.facebook.com"],
    category: "Advertising",
  },
  {
    name: "TikTok Pixel",
    hostnames: ["analytics.tiktok.com", "business-api.tiktok.com"],
    category: "Advertising",
  },
  {
    name: "LinkedIn Insight",
    hostnames: ["snap.licdn.com", "px.ads.linkedin.com"],
    category: "Advertising",
  },
  {
    name: "Twitter/X Pixel",
    hostnames: ["static.ads-twitter.com", "analytics.twitter.com", "t.co"],
    category: "Advertising",
  },
  {
    name: "Hotjar",
    hostnames: ["static.hotjar.com", "script.hotjar.com", "vars.hotjar.com"],
    category: "Analytics",
  },
  {
    name: "Microsoft Clarity",
    hostnames: ["clarity.ms", "www.clarity.ms"],
    category: "Analytics",
  },
  {
    name: "Segment",
    hostnames: ["cdn.segment.com", "api.segment.io"],
    category: "Analytics",
  },
  {
    name: "Mixpanel",
    hostnames: ["cdn.mxpnl.com", "api.mixpanel.com", "api-js.mixpanel.com"],
    category: "Analytics",
  },
  {
    name: "Amplitude",
    hostnames: ["cdn.amplitude.com", "api.amplitude.com"],
    category: "Analytics",
  },
  {
    name: "Hubspot",
    hostnames: ["js.hs-scripts.com", "js.hsforms.net", "track.hubspot.com"],
    category: "Marketing",
  },
  {
    name: "Intercom",
    hostnames: ["widget.intercom.io", "api-iam.intercom.io"],
    category: "Customer Support",
  },
  {
    name: "Snapchat Pixel",
    hostnames: ["sc-static.net", "tr.snapchat.com"],
    category: "Advertising",
  },
  {
    name: "Pinterest Tag",
    hostnames: ["ct.pinterest.com", "s.pinimg.com"],
    category: "Advertising",
  },
  {
    name: "Sentry",
    hostnames: ["browser.sentry-cdn.com", "sentry.io"],
    category: "Error Monitoring",
  },
  {
    name: "FullStory",
    hostnames: ["fullstory.com", "rs.fullstory.com"],
    category: "Session Replay",
  },
];

export function identifyVendor(hostname: string): VendorPattern | null {
  return (
    KNOWN_VENDORS.find((v) =>
      v.hostnames.some(
        (h) => hostname === h || hostname.endsWith(`.${h}`)
      )
    ) ?? null
  );
}
