# JungleBoat Vacations website

A plain HTML/CSS/JS site, hosted free on Cloudflare Workers (static assets). There's no build step.

```
public/               the website (everything here is published)
  index.html
  css/styles.css
  js/main.js
  images/             compressed photos (WebP)
  _headers, _redirects
src/worker.js         serves public/ and routes /api/contact
src/contact.js        contact form backend
scripts/compress_images.py photo compressor
wrangler.toml         Cloudflare config + contact email address
```

## Adding photos

1. Put the original photos in `images-src/`. This folder is gitignored, so originals never land in the repo.
2. Run `python scripts/compress_images.py images-src public/images`.
3. Reference them as `/images/<name>.webp`.

## Deploying (Cloudflare Workers)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick this repo.
2. Keep the defaults: build command empty, deploy command `npx wrangler deploy`.
   The Worker name in the dashboard must match `name` in `wrangler.toml` (`jungleboat-website`).
3. In the Worker's **Settings → Domains & Routes**, add `jungleboatvacations.com` and `www.jungleboatvacations.com` as custom domains.

Every push to `main` deploys automatically. Cloudflare runs the build, so this uses none of your GitHub Actions minutes.
Static files are free and unlimited, and the contact form uses a few of the free plan's 100,000 Worker requests a day.

## Contact form setup

Messages go to the `CONTACT_TO` address in `wrangler.toml`.

1. **Turnstile (spam protection):** Cloudflare dashboard → **Turnstile** → **Add widget** for `jungleboatvacations.com`.
   - The **site key** is in `public/index.html` (`data-sitekey`).
   - Add the **secret key** as an encrypted variable `TURNSTILE_SECRET_KEY` in the Worker (Settings → Variables and Secrets).
2. **Resend (sending email):** sign up at resend.com and create an API key. Add it as a secret `RESEND_API_KEY` in the same place.
3. **Sender address:** `CONTACT_FROM` uses `contact@jungleboatvacations.com`. The domain is verified in Resend, so any address on it can send. It's send-only and has no inbox.

Replies go straight to the visitor, because each message sets `reply_to` to the email address they entered.

## Local preview

```
npx wrangler dev
```

Copy `.dev.vars.example` to `.dev.vars` first if you want to test the form locally.
