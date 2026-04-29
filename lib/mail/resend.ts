import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "no-reply@iautentica.cl";

const client = apiKey ? new Resend(apiKey) : null;

type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  if (!client) {
    console.warn("[sendMail] RESEND_API_KEY not set — skipping:", input.subject);
    return;
  }
  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
    });
    if (error) {
      console.error("[sendMail] Resend error:", error);
    }
  } catch (err) {
    console.error("[sendMail] exception:", err);
  }
}
