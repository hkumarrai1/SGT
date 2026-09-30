import brevoSdk from "@getbrevo/brevo";
import { env } from "./env.js";

const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail } =
  brevoSdk;
const brevo = new TransactionalEmailsApi();

brevo.setApiKey(TransactionalEmailsApiApiKeys.apiKey, env.brevoApiKey);

export { SendSmtpEmail };
export default brevo;
