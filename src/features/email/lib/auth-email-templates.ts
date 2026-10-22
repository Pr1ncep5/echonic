export interface EmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

interface LayoutInput {
  readonly subject: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly action: { readonly label: string; readonly url: string };
  readonly footnote: string;
}

// Organization and user names are user input, so they must never reach the HTML unescaped.
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout({ subject, heading, paragraphs, action, footnote }: LayoutInput): EmailContent {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3f3f46">${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:${font}">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:40px 32px">
<tr><td>
<p style="margin:0 0 32px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#18181b">Echonic</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:#18181b">${escapeHtml(heading)}</h1>
${body}
<a href="${escapeHtml(action.url)}" style="display:inline-block;margin:8px 0 24px;padding:12px 20px;border-radius:10px;background:#c2410c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(action.label)}</a>
<p style="margin:0;font-size:13px;line-height:1.5;color:#71717a">${escapeHtml(footnote)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    heading,
    "",
    ...paragraphs,
    "",
    `${action.label}: ${action.url}`,
    "",
    footnote,
  ].join("\n");

  return { subject, html, text };
}

const IGNORE_IF_NOT_YOU = "If you didn't request this, you can safely ignore this email.";

export function magicLinkEmail(url: string): EmailContent {
  return layout({
    subject: "Your Echonic sign-in link",
    heading: "Sign in to Echonic",
    paragraphs: ["Use the button below to sign in. The link expires in 5 minutes."],
    action: { label: "Sign in", url },
    footnote: IGNORE_IF_NOT_YOU,
  });
}

export function resetPasswordEmail(url: string): EmailContent {
  return layout({
    subject: "Set your Echonic password",
    heading: "Set your password",
    paragraphs: ["Use the button below to choose a new password. The link expires in 1 hour."],
    action: { label: "Set password", url },
    footnote: IGNORE_IF_NOT_YOU,
  });
}

export function verifyEmailEmail(url: string): EmailContent {
  return layout({
    subject: "Confirm your email for Echonic",
    heading: "Confirm your email",
    paragraphs: ["Confirm this address to use it for signing in to Echonic."],
    action: { label: "Confirm email", url },
    footnote: IGNORE_IF_NOT_YOU,
  });
}

export function deleteAccountEmail(url: string): EmailContent {
  return layout({
    subject: "Confirm deleting your Echonic account",
    heading: "Delete your account?",
    paragraphs: [
      "Confirming permanently deletes your account and signs you out everywhere. This can't be undone.",
      "Organizations you belong to, and their voices and generations, are not affected.",
    ],
    action: { label: "Delete my account", url },
    footnote: "If you didn't request this, ignore this email and your account stays as it is.",
  });
}

export function invitationEmail(input: {
  readonly organizationName: string;
  readonly inviterName: string;
  readonly role: string;
  readonly url: string;
}): EmailContent {
  return layout({
    subject: `${input.inviterName} invited you to ${input.organizationName} on Echonic`,
    heading: `Join ${input.organizationName}`,
    paragraphs: [
      `${input.inviterName} invited you to join ${input.organizationName} on Echonic as ${input.role}.`,
      "Sign in or create an account with this email address to accept.",
    ],
    action: { label: "View invitation", url: input.url },
    footnote: "If you weren't expecting this invitation, you can ignore this email.",
  });
}
