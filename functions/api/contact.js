// Cloudflare Pages Function: POST /api/contact
// Checks the Turnstile spam token, then emails the message through Resend.
//
// Env vars (Cloudflare dashboard → Pages project → Settings → Variables):
//   RESEND_API_KEY        secret
//   TURNSTILE_SECRET_KEY  secret
//   CONTACT_TO            inbox that receives messages (set in wrangler.toml)
//   CONTACT_FROM          sender address (must be allowed by Resend)

const MAX_LEN = { name: 100, email: 200, phone: 40, destination: 60, dates: 100, guests: 60, message: 5000 };

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid form data." }, 400);
  }

  // Honeypot: real people never fill this hidden field.
  if (form.get("company")) return json({ ok: true });

  const data = {};
  for (const [key, max] of Object.entries(MAX_LEN)) {
    data[key] = String(form.get(key) ?? "").trim().slice(0, max);
  }

  if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return json({ ok: false, error: "Please fill in your name, a valid email, and a message." }, 400);
  }

  const verified = await verifyTurnstile(
    form.get("cf-turnstile-response"),
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!verified) {
    return json({ ok: false, error: "Spam check failed. Please refresh the page and try again." }, 400);
  }

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    data.destination ? `Destination: ${data.destination}` : null,
    data.dates ? `Travel dates: ${data.dates}` : null,
    data.guests ? `Travelers: ${data.guests}` : null,
    "",
    data.message,
  ].filter((l) => l !== null);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: data.email,
      subject: `Trip inquiry from ${data.name}${data.destination ? ` (${data.destination})` : ""}`,
      text: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return json({ ok: false, error: "Sorry, your message couldn't be sent. Please email us directly." }, 502);
  }

  return json({ ok: true });
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || !secret) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const out = await res.json();
  return out.success === true;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
