/** Downloads a Generation's audio, named after the start of its text. */
export function downloadGeneration(audioUrl: string, text: string) {
  const safeName =
    text
      .slice(0, 50)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "speech";

  const link = document.createElement("a");
  link.href = audioUrl;
  link.download = `${safeName}.wav`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
