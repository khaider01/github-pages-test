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
(dataset + premade functions + SVG charts), `assets/img/` (drop figures here),
`docs/data-workflow.md` (how the data gets published).

## What still needs real content

1. **Storybook findings** — every block marked `Draft — replace` in `storybook.html`
   is a placeholder for K's actual results, figures and quotes.
2. **Real measurements** — replace the `DATASET` object at the top of
   `assets/js/explore.js`. The expected row shape is:
   ```js
   { site: "…", type: "…", region: "…", year: 2022, month: 5, value: 123 }
   ```
   `value` is 6PPD-quinone in ng/L. Charts, tables, statistics and the KPI tiles all
   recompute from whatever is in that array. The intended end state is generated
   JSON under `data/` instead of an inline array — see
   [docs/data-workflow.md](docs/data-workflow.md).
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

## Data: how it gets published

The site is static, so it cannot query Access or any database at runtime. Data
reaches the site through a **one-way snapshot export**, documented in
[docs/data-workflow.md](docs/data-workflow.md):

1. Curators edit the five tables in Access (or the CSVs). That is the editing store.
2. A saved query plus a converter produce `data/*.json` with the primary and foreign
   keys intact. That is the publishing store, and it is machine-generated only.
3. The export is validated (row counts, orphan keys, `ng/L` units, ISO dates) before
   anything is committed. A failed check stops the commit.
4. `git push` to `main` — Pages serves the new snapshot within about a minute.

Consequences: every published number is traceable to a commit, the editing store is
never exposed to the browser, and refreshing the data never involves touching HTML.
Automation runs from a manual five-minute routine up to a GitHub Actions workflow that
converts and validates on every push.

Right now the explorer still ships its illustrative rows inline in
`assets/js/explore.js`; the `data/` files and converter are the next step.

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

