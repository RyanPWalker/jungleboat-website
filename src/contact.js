// Contact form handler: POST /api/contact
// Checks the Turnstile spam token, then emails the message through Resend.
//
// Env vars (Cloudflare dashboard → Worker → Settings → Variables and Secrets):
//   RESEND_API_KEY        secret
//   TURNSTILE_SECRET_KEY  secret
//   CONTACT_TO            inbox that receives messages (set in wrangler.toml)
//   CONTACT_FROM          sender address (must be allowed by Resend)

const MAX_LEN = { name: 100, email: 200, phone: 40, destination: 60, budget: 40, dates: 100, guests: 60, message: 5000 };
const BUDGETS = ["Under $5,000", "$5,000 – $10,000", "$10,000 – $15,000", "$15,000 – $25,000", "$25,000+"];

export async function handleContact(request, env) {
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
    data[key] = String(form.get(key) ?? "")
      .trim()
      .slice(0, max);
  }

  if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return json({ ok: false, error: "Please fill in your name, a valid email, and a message." }, 400);
  }

  if (!BUDGETS.includes(data.budget)) {
    return json({ ok: false, error: "Please choose your approximate budget." }, 400);
  }

  const check = await verifyTurnstile(
    form.get("cf-turnstile-response"),
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!check.ok) {
    console.error("Turnstile rejected", check.codes);
    return json(
      { ok: false, error: "Spam check failed. Please refresh the page and try again.", codes: check.codes },
      400,
    );
  }

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    data.destination ? `Destination: ${data.destination}` : null,
    `Budget: ${data.budget}`,
    data.dates ? `Travel dates: ${data.dates}` : null,
    data.guests ? `Travelers: ${data.guests}` : null,
    "",
    data.message,
  ].filter((l) => l !== null);

  const sendError = json(
    { ok: false, error: "Sorry, your message couldn't be sent. Please email us directly." },
    502,
  );
  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: data.email,
        subject: `Trip inquiry from ${data.name}${data.destination ? ` (${data.destination})` : ""}, ${data.budget}`,
        text: lines.join("\n"),
      }),
    });
  } catch (err) {
    console.error("Resend request failed", err);
    return sendError;
  }

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return sendError;
  }

  return json({ ok: true });
}

async function verifyTurnstile(token, secret, ip) {
  // Error codes are Cloudflare's, plus two of ours for a missing token or secret.
  if (!secret) return { ok: false, codes: ["missing-secret-env"] };
  if (!token) return { ok: false, codes: ["missing-token"] };
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const out = await res.json();
    return { ok: out.success === true, codes: out["error-codes"] ?? [] };
  } catch (err) {
    console.error("Turnstile request failed", err);
    return { ok: false, codes: ["siteverify-unreachable"] };
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
