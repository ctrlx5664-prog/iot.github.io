// Email service using Resend (free tier: 100 emails/day)
// https://resend.com

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@example.com";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email send");
    // In development, log the email content
    console.log("[Email] Would send:", {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return true; // Return true in dev mode so flow continues
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[Email] Failed to send:", error);
      return false;
    }

    console.log("[Email] Sent successfully to:", options.to);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

export function generateVerificationCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendVerificationCodeEmail(
  to: string,
  code: string,
  type: "register" | "login"
): Promise<boolean> {
  const subject =
    type === "register"
      ? "Verifique o seu email - CtrlX"
      : "Código de verificação - CtrlX";

  const actionText =
    type === "register"
      ? "para completar o seu registo"
      : "para iniciar sessão na sua conta";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #06b6d4, #2563eb); border-radius: 12px; margin-bottom: 16px;">
        <span style="font-size: 24px; line-height: 48px; color: white;">⚡</span>
      </div>
      <h1 style="color: #18181b; font-size: 24px; margin: 0;">CtrlX</h1>
    </div>
    
    <p style="color: #52525b; font-size: 16px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
      Use o código abaixo ${actionText}:
    </p>
    
    <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${code}</span>
    </div>
    
    <p style="color: #71717a; font-size: 14px; text-align: center; margin-bottom: 0;">
      Este código expira em 10 minutos.<br>
      Se não solicitou este código, pode ignorar este email.
    </p>
  </div>
  
  <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 24px;">
    © ${new Date().getFullYear()} CtrlX. Todos os direitos reservados.
  </p>
</body>
</html>
  `.trim();

  const text = `
CtrlX - Código de Verificação

Use o código abaixo ${actionText}:

${code}

Este código expira em 10 minutos.
Se não solicitou este código, pode ignorar este email.
  `.trim();

  return sendEmail({ to, subject, html, text });
}


