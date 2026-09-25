# shellonline site template

One re-skinnable 5-page static site (Home, Services, About, Gallery & Reviews,
Contact). Plain HTML/CSS + a small dependency-free Node build script. No
framework, no npm install, no paid services.

## Re-skin a new customer in about an hour

1. **Copy `config.json`** to a new file, e.g. `configs/acme-interiors.json`.
2. **Edit that one file.** Everything customer-specific lives here:
   - `business` — name, phone, WhatsApp number, address, map link, socials
   - `theme` — the 6 colours and 2 fonts that skin every page
   - `sample` — set `isUnpaidSample` to `true`/`false` and edit the notice
     banner text (use `true` for unpaid demo sites, `false` for a paid
     customer's live site)
   - `nav` — the 5 nav links (rename labels if you like, don't add pages
     without also adding a template in `pages/`)
   - `pages.home` / `pages.services` / `pages.about` / `pages.contact` /
     `pages.gallery` — page titles, meta descriptions, and all copy/photo
     lists for that page
3. **Replace the photos.** Drop the customer's real project photos into
   `assets/img/` (keep the same filenames referenced in your config, or
   update the `image`/`src` paths in the config to match). Compress them
   first — see "Image weight" below.
4. **Build it:**
   ```bash
   node build.js --config configs/acme-interiors.json --out dist-acme
   ```
   This generates fully static HTML in the output folder, with each page's
   `<title>` and `<meta name="description">` baked in (not injected by JS —
   real for SEO), plus a `theme.css` generated from your colours/fonts.
5. **Preview locally:**
   ```bash
   python3 -m http.server 8000 --directory dist-acme
   ```
   Open `http://localhost:8000/index.html` and check it at a 360px-wide
   viewport (phone width) before shipping.
6. **Deploy** the output folder to any free static host (GitHub Pages,
   Cloudflare Pages, Netlify's free tier — drag-and-drop the folder). Nothing
   here needs a server, a database, or a paid tier.

That's it — one file edited (`config.json`), one command run (`node
build.js`), one folder deployed. If re-skinning ever needs more than that,
the template has drifted from its own rule — fix the template, not the
process.

## What's inside

```
template/
├── config.json        ← the one file you edit per customer
├── build.js            ← the one command you run (no npm install needed)
├── partials/           ← shared header/footer (rarely touched)
├── pages/               ← the 5 page templates (rarely touched)
├── assets/
│   ├── css/style.css    ← layout + components (rarely touched)
│   ├── js/main.js       ← mobile nav toggle only, ~20 lines
│   └── img/             ← photos + placeholder SVGs (replace per customer)
└── dist/                ← generated output (safe to delete, rebuilt each run)
```

## Built-in requirements checklist

- **Mobile-first, 360px:** every page is designed at 360px width first, then
  widens with two breakpoints (700px/800px). Verify with your browser's
  device toolbar or `--window-size=360,800` in a headless browser.
- **WhatsApp on every page:** a floating button (bottom-right, all pages)
  plus a header nav button and inline CTAs, all pointing at
  `business.whatsappNumber` with a pre-filled `business.whatsappDefaultMessage`.
- **Enquiry form + fallback:** the Contact page form uses
  `action="mailto:..."` so it works with zero backend and zero third-party
  signup — it opens the visitor's email app pre-addressed to
  `pages.contact.formActionEmail`. WhatsApp is still the primary,
  one-tap path; the form is the backup.
- **Google Map, no API key:** `business.mapEmbedSrc` uses the free
  `https://www.google.com/maps?q=<address>&output=embed` pattern in an
  `<iframe>`. This only renders inside an iframe (Google blocks it as a
  direct page) — that's expected and already how it's wired up. The iframe
  is `loading="lazy"`, so it won't load until a visitor scrolls near it.
- **Real titles/meta descriptions:** written into `<head>` per page from
  `pages.<page>.title` / `.metaDescription` at build time — view-source
  shows real content, not a JS-injected placeholder.
- **Lazy-loaded gallery images:** every gallery/service image has
  `loading="lazy"` and explicit `width`/`height` to avoid layout shift.
- **Weight budget:** first view (`index.html` + `theme.css` +
  `assets/css/style.css`) is about 13KB before you add real photos. No web
  fonts are loaded — the theme uses the visitor's system font by default,
  which you can override in `theme.headingFont`/`bodyFont` if a customer
  insists on a specific look (adds network weight, use sparingly).
- **Unpaid-sample notice:** set `sample.isUnpaidSample: true` for any demo
  site built for outreach; it renders a dismissable-looking (but always
  visible) banner across the top of every page. Set it to `false` for a
  paying customer's real site.

## Image weight

The template ships with SVG placeholders in `assets/img/` labelled "Replace
with a real photo" — they're intentionally not real content. Before shipping
a customer or demo site:

1. Replace every placeholder with a real, compressed photo (aim for under
   150–200KB per photo; resize to roughly the display size first — a phone
   photo straight off a camera can be 5–10MB).
2. Keep the same `width`/`height` attributes in the page HTML in sync with
   the real image's aspect ratio, or update them, to avoid layout shift.

## Known limitation

`build.js` re-generates the whole output folder from one config plus the
shared page/partial templates — it cannot yet build multiple customers into
side-by-side output folders from a single command (run it once per
customer with a different `--config`/`--out` pair, as shown above).
