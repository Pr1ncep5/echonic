import { Resend } from "resend";
import { env } from "./env";

/** Null when RESEND_API_KEY is unset; sending then fails with EmailNotConfiguredError. */
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
