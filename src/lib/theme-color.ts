/**
 * For canvases, which cannot use CSS variables and so need a design token resolved to a
 * colour in script.
 *
 * The theme is a class on <html>. next-themes sets it in an effect, after React has
 * already rendered (and run child effects) with the new theme name, so reading a token in
 * response to `useTheme()` returns the previous theme's colour. Subscribe to the class
 * itself instead.
 */
export function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** The colour a token such as "--primary" has in the current theme. */
export function readThemeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
