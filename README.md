# Yana Prydeus — portfolio

A personal landing page for a product designer, built as an open notebook lying on a pastel meadow.
Plain HTML, CSS and JS — no build step.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | Loader (the notebook opens) → Hero → Work → About → Hobbies → Contact |
| `cases/fixfind.html` | Case-study page template (FixFind) |
| `css/style.css` | All styles; palette tokens at the top of the file |
| `js/i18n.js` | Ukrainian strings (English lives in the HTML) and the Work preview data |
| `js/main.js` | Language switch, Work preview, hobby flip cards, active tabs, case scroll-spy |
| `assets/meadow-*.webp` | Generated background (wide for desktop, tall for phones) |
| `tools/meadow/` | The background generator |

## Regenerate the background

The meadow is painted procedurally on a canvas. Change the seed for a different arrangement:

```bash
node tools/meadow/render.js /tmp/meadow 7
```

Then convert the two JPEGs from the output folder to WebP and put them in `assets/`.

## Still to fill in

- Your portrait in the hero (`[ your photo ]`) and hobby photos, captions and notes
- CV file at `assets/Yana-Prydeus-CV.pdf`
- FixFind: screenshots, problem, research insights, results, "what I'd do next", live and prototype links
- Case pages for FinPay, Allsave, Emora and Checkout & PDP (they show "Case coming soon" for now)
