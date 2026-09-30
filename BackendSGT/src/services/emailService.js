import brevo, { SendSmtpEmail } from "../config/brevo.js";
import { env } from "../config/env.js";

export async function sendOtpEmail({ email, otp }) {
  const message = new SendSmtpEmail();
  message.sender = { email: env.brevoFromEmail, name: env.brevoFromName };
  message.to = [{ email }];

  if (env.brevoTemplateId) {
    message.templateId = Number(env.brevoTemplateId);
    message.params = { otp, email };
  } else {
    message.subject = "Your SGT verification code";
    message.textContent = `Your SGT verification code is ${otp}. It expires in 10 minutes. Do not share this code.`;
    message.htmlContent = `<h2>Your SGT verification code</h2><p>Use <strong>${otp}</strong> to continue.</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`;
  }

  await brevo.sendTransacEmail(message);
}
