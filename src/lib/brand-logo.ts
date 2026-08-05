import "server-only";
import fs from "fs";
import path from "path";

/**
 * Looks for a real exported logo lockup (icon + "Reign" wordmark together)
 * dropped into public/brand/. If present, pages should render it as-is
 * instead of the icon.svg + live-Inter-text placeholder — this makes the
 * real asset a drop-in upgrade with no further code changes.
 */
export function getBrandLogoPath(): string | null {
  const candidates = ["logo.svg", "logo.png"];
  for (const file of candidates) {
    if (fs.existsSync(path.join(process.cwd(), "public", "brand", file))) {
      return `/brand/${file}`;
    }
  }
  return null;
}
