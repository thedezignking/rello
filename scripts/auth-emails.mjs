// Sets Supabase's sign-in emails to show a 6-digit code (no links) and adds
// the auth callback to the redirect allow-list without replacing existing URLs.
// Uses the Management API with
// SUPABASE_ACCESS_TOKEN (a personal access token) from .env.local. On the
// free plan this needs your own email sender: set SMTP_HOST, SMTP_PORT,
// SMTP_USER, SMTP_PASS and SMTP_FROM too.
//
//   npm run auth:emails            apply
//   npm run auth:emails -- --dry   show the current settings only
//   npm run auth:emails -- --site-url=https://your-live-site.example

import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")]),
);
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error("Add SUPABASE_ACCESS_TOKEN to .env.local");
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const email = (lead) => `<div style="font-family:Arial,Helvetica,sans-serif;color:#15171c;max-width:440px">
  <p style="font-size:22px;font-weight:600;margin:0 0 12px">Your Rello sign-in code</p>
  <p style="margin:0 0 16px;color:#5d6470">${lead}</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px">{{ .Token }}</p>
  <p style="margin:0;color:#5d6470;font-size:13px">This code expires in 1 hour. If you didn't ask for it, you can ignore this email.</p>
</div>`;

const settings = {
  // Must match CODE_LENGTH in src/features/auth/sign-in-dialog.tsx.
  mailer_otp_length: 6,
  mailer_subjects_magic_link: "Your Rello sign-in code",
  mailer_templates_magic_link_content: email("Enter this code to sign in:"),
  mailer_subjects_confirmation: "Your Rello sign-in code",
  mailer_templates_confirmation_content: email("Enter this code to finish creating your account:"),
  mailer_subjects_email_change: "Your Rello sign-in code",
  mailer_templates_email_change_content: email("Enter this code to save your resumes to this email:"),
};

// Resend's SMTP: the username is always "resend" and the password is the API
// key. A verified sender is required: Resend's onboarding sender cannot
// deliver sign-in codes to customers.
if (env.RESEND_API_KEY && !env.SMTP_HOST) {
  Object.assign(env, {
    SMTP_HOST: "smtp.resend.com",
    SMTP_PORT: "465",
    SMTP_USER: "resend",
    SMTP_PASS: env.RESEND_API_KEY,
    SMTP_FROM: env.SMTP_FROM,
  });
}

// Supabase only allows custom templates when emails go through your own
// sender (SMTP). Set these in .env.local to connect one in the same run.
if (env.SMTP_HOST) {
  for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
    if (!env[k]) throw new Error(`Add ${k} to .env.local`);
  }
  const sender = env.SMTP_FROM.match(/<([^<>]+)>/)?.[1] ?? env.SMTP_FROM;
  if (!/^\S+@\S+\.\S+$/.test(sender) || sender.endsWith("@resend.dev")) {
    throw new Error("Set SMTP_FROM to an email address on your verified sending domain.");
  }
  if (env.SMTP_HOST === "smtp.resend.com" && !process.argv.includes("--dry")) {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${env.SMTP_PASS}` },
    });
    const domains = await response.json();
    if (
      !response.ok ||
      !domains.data?.some((d) => d.name === sender.split("@")[1] && d.status === "verified")
    ) {
      throw new Error("The SMTP_FROM domain must be verified in Resend before configuring sign-in emails.");
    }
  }
  Object.assign(settings, {
    smtp_host: env.SMTP_HOST,
    smtp_port: env.SMTP_PORT,
    smtp_user: env.SMTP_USER,
    smtp_pass: env.SMTP_PASS,
    smtp_admin_email: sender,
    smtp_sender_name: "Rello",
    // Supabase's default two-email hourly limit also applies to custom SMTP
    // until explicitly changed. Keep per-recipient throttling enabled.
    rate_limit_email_sent: Number(env.AUTH_EMAIL_RATE_LIMIT || 30),
    smtp_max_frequency: 60,
  });
}

function summary(c) {
  const has = (s, x) => typeof s === "string" && s.includes(x);
  return {
    code_length: c.mailer_otp_length,
    sign_in_email_has_code: has(c.mailer_templates_magic_link_content, "{{ .Token }}"),
    sign_in_email_has_link: has(c.mailer_templates_magic_link_content, "ConfirmationURL"),
    new_account_email_has_code: has(c.mailer_templates_confirmation_content, "{{ .Token }}"),
    new_account_email_has_link: has(c.mailer_templates_confirmation_content, "ConfirmationURL"),
    custom_smtp: !!c.smtp_host,
    sender: c.smtp_admin_email,
    emails_per_hour: c.rate_limit_email_sent,
    site_url: c.site_url,
    redirect_urls: c.uri_allow_list,
  };
}

const currentResponse = await fetch(api, { headers });
if (!currentResponse.ok) throw new Error(`Could not read auth settings (${currentResponse.status}).`);
const current = await currentResponse.json();
console.log("Before:", summary(current));

if (!process.argv.includes("--dry")) {
  const site =
    process.argv.find((arg) => arg.startsWith("--site-url="))?.slice(11) || env.NEXT_PUBLIC_SITE_URL;
  if (site) settings.site_url = new URL(site).origin;
  settings.uri_allow_list = [
    ...new Set([
      ...(current.uri_allow_list || "").split(",").filter(Boolean),
      "http://localhost:3000/auth/callback",
      "http://localhost:3001/auth/callback",
      ...(site ? [`${new URL(site).origin}/auth/callback`] : []),
    ]),
  ].join(",");
  if (
    settings.rate_limit_email_sent !== undefined &&
    (!Number.isInteger(settings.rate_limit_email_sent) || settings.rate_limit_email_sent < 2)
  ) {
    throw new Error("AUTH_EMAIL_RATE_LIMIT must be an integer of at least 2.");
  }
  const res = await fetch(api, { method: "PATCH", headers, body: JSON.stringify(settings) });
  if (res.ok) {
    console.log("After: ", summary(await fetch(api, { headers }).then((r) => r.json())));
  } else {
    console.error(`Supabase refused the change (${res.status}):`, (await res.text()).slice(0, 400));
    process.exitCode = 1;
  }
}
