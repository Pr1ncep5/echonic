const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export interface DeviceDescription {
  label: string;
  isMobile: boolean;
}

/** Order matters: Edge and Opera also send "Chrome", and Chrome also sends "Safari". */
export function describeUserAgent(userAgent: string | null | undefined): DeviceDescription {
  if (!userAgent) return { label: "Unknown device", isMobile: false };

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const label = [browser, system].filter(Boolean).join(" on ") || "Unknown device";

  return { label, isMobile: /Mobi|iPhone|Android/.test(userAgent) };
}
