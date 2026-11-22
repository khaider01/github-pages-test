# 6PPD-Q Data Hub

A small static site about **6PPD-quinone**, the tire-derived chemical that causes
urban runoff mortality syndrome in coho salmon. It doubles as the public front
end of a 6PPD-quinone database.

Live site (once Pages is enabled — see below):

https://khaider01.github.io/github-pages-test/

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Overview: purpose of the project, what the database holds, entry points |
| `background.html` | Primer on 6PPD and 6PPD-quinone: chemistry, sources, toxicology, relevance |
| `storybook.html` | Chapter-by-chapter research narrative — **contains draft slots for K's findings** |
| `explore.html` | Interactive explorer: filter the data, run premade analyses, download the selection |
| `resources.html` | Primary literature, agency programs, databases, code and citation guidance |

Supporting files: `assets/css/styles.css` (design system), `assets/js/explore.js`
(dataset + premade functions + SVG charts), `assets/img/` (drop figures here).

## What still needs real content

1. **Storybook findings** — every block marked `Draft — replace` in `storybook.html`
   is a placeholder for K's actual results, figures and quotes.
2. **Real measurements** — replace the `DATASET` object at the top of
   `assets/js/explore.js`. The expected row shape is:
   ```js
   { site: "…", type: "…", region: "…", year: 2022, month: 5, value: 123 }
   ```
   `value` is 6PPD-quinone in ng/L. Charts, tables, statistics and the KPI tiles all
   recompute from whatever is in that array.
3. **Reference threshold** — `REFERENCE` in the same file (currently 95 ng/L, the
   approximate coho acute toxicity threshold from the literature).
4. **Resources** — add DOI links and dataset links as they are confirmed.

## Explorer in brief

- Filters: region and site type; state is also readable from the URL, e.g.
  `explore.html?view=seasonal&region=Puget%20Sound` (shareable links).
- Premade analyses: summary by site type, highest sites, seasonal pattern,
  threshold exceedance.
- Helper library `gp`: `filter`, `groupBy`, `summary`, `median`, `mean`, `fmt`, `csv`.
- Adding an analysis = one entry in the `VIEWS` object + one `<button data-view="…">`.
  Full example is on the Explore page itself.

## Design notes

- One stylesheet, no framework, no build step. Light and dark themes follow
  `prefers-color-scheme`.
- Charts are hand-built SVG (no chart library) so they inherit the theme colours.
- Sample data is explicitly labelled as illustrative on every page that shows it.

## Local preview

Open `index.html` directly, or serve the folder (needed for `?view=` URLs):

```powershell
python -m http.server 8000
```

Then visit http://localhost:8000/.

## How it deploys

Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
Everything on `main` is served as-is: edit a file, commit, push, and the live site
updates within a minute or so. `.nojekyll` is present so Jekyll processing is skipped.

