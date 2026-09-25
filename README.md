# shellonline

Fixed-price websites for Bengaluru interior designers and modular-kitchen
studios. This repo holds the two things the business runs on.

## `template/`

The one re-skinnable site every customer and demo site is built from. Edit
one `config.json`, run `node build.js`, deploy the output folder. See
[`template/README.md`](template/README.md) for the full re-skin walkthrough.

## `site/` and `docs/`

`site/` is the source for shellonline's own shopfront (what we do, pricing,
demo slots, WhatsApp button). `docs/` is a plain copy of `site/` and is what
GitHub Pages actually serves — after editing `site/`, copy the changed files
into `docs/` and push:

```bash
cp site/index.html site/style.css docs/
git add docs site && git commit -m "Update shopfront copy"
git push
```

Live at whatever URL GitHub Pages reports for this repo (Settings → Pages).

## Zero running cost

Everything here is static HTML/CSS/JS. No build pipeline the owner can't run
on a laptop, no paid tier, no card on file. Hosting is GitHub Pages (free).
