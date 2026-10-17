function detectPlatform() {
  const name = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  if (name.startsWith("mac")) return "mac";
  if (name.startsWith("win")) return "windows";
  if (name.includes("chrome os") || name.includes("cros")) return "chromeos";
  return "linux";
}

export const platform = detectPlatform();
export const isMac = platform === "mac";
