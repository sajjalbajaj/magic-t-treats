/**
 * Clipboard write with a fallback.
 *
 * navigator.clipboard is unavailable on insecure origins and is refused by
 * some in-app browsers — which is exactly where this traffic comes from, since
 * most visitors arrive by tapping a link inside Instagram. The enquiry flow
 * depends on the message actually reaching the clipboard, so a legacy
 * execCommand path is kept as a backstop.
 *
 * Must be called from within a user gesture.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Keep it off-screen but still selectable; `display:none` cannot be copied.
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
