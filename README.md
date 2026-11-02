# Jungle Boat Vacations website

A plain HTML/CSS/JS site, hosted on Cloudflare Pages. There's no build step.

```
public/               the website (everything here is published)
  index.html
  css/styles.css
  js/main.js
  images/             compressed photos (WebP)
functions/api/contact.js   contact form backend (runs on Cloudflare)
scripts/compress_images.py photo compressor
wrangler.toml         Cloudflare config + contact email address
```

## Adding photos

1. Put the original photos in `images-src/`. This folder is gitignored, so originals never land in the repo.
2. Run `python scripts/compress_images.py images-src public/images`.
3. Reference them as `/images/<name>.webp`.

## Deploying (Cloudflare Pages)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick this repo.
2. Build settings: framework **None**, build command *(empty)*, output directory `public`.
3. Add the custom domain `jungleboatvacations.com` (and `www`) under the project's **Custom domains** tab once DNS is on Cloudflare.

Every push to `main` deploys automatically. Cloudflare runs the build, so this uses none of your GitHub Actions minutes.

## Contact form setup

Messages go to the `CONTACT_TO` address in `wrangler.toml`.

1. **Turnstile (spam protection):** Cloudflare dashboard → **Turnstile** → **Add widget** for `jungleboatvacations.com`.
   - Put the **site key** in `public/index.html`, replacing `1x00000000000000000000AA`.
   - Add the **secret key** as an encrypted variable `TURNSTILE_SECRET_KEY` in the Pages project (Settings → Variables and Secrets).
2. **Resend (sending email):** sign up at resend.com and create an API key. Add it as an encrypted variable `RESEND_API_KEY` in the Pages project.
3. **Sender address:** until the domain is verified, `onboarding@resend.dev` can only send to the email address you signed up to Resend with. So either sign up with the Gmail address in `CONTACT_TO`, or verify the domain:
   - In Resend → **Domains**, add `jungleboatvacations.com`. Resend can add its DNS records to Cloudflare for you.
   - Then change `CONTACT_FROM` in `wrangler.toml` to something like `Jungle Boat Vacations <contact@jungleboatvacations.com>`.

Replies go straight to the visitor, because each message sets `reply_to` to the email address they entered.

## Local preview

```
npx wrangler pages dev
```

Copy `.dev.vars.example` to `.dev.vars` first if you want to test the form locally.
