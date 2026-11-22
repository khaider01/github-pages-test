# Serving our data: the snapshot method

**Who this is for:** anyone who edits the 6PPD-quinone tables and needs the public
site to show the change. No web development knowledge required.

> This file is public: GitHub Pages serves everything on `main`, including `docs/`.
> Don't put credentials, local file paths or unpublished findings here.

## The one thing to understand

The site is hosted on GitHub Pages, which **only serves files**. It cannot open a
database, query Access, or run any code on a server. Access is a desktop file, not a
web service, so there is no way for a browser to "connect" to it.

So the data lives in two places, each with a different job:

| Copy | Where it lives | Who touches it | Job |
| --- | --- | --- | --- |
| **Editing store** | Access `.accdb` or the five CSVs | Lab / data owner | Fix typos, add samples, check QC |
| **Publishing store** | `data/*.json` in this repo | Generated, never hand-edited | What the website actually reads |

A one-way export copies editing -> publishing. Users only ever see the publishing
store. Nothing is deleted from the editing store, and the editing store is never in
the browser's hands.

## The pipeline

```
Access .accdb  (or the 5 CSVs)
        |
        |  export + validate  (saved query, or scripts/export_from_access.py)
        v
  data/sites.json  data/samples.json  data/results.json
  data/methods.json  data/regions.json      <-- committed to this repo
        |
        |  git commit + push
        v
  GitHub Pages rebuilds in ~60 s -> https://khaider01.github.io/github-pages-test/
```

Two consequences worth internalising:

- **Every published number has a git history entry.** For a citable dataset that is a
  feature: you can always answer "what did the site show on 3 March, and why did it
  change?"
- **A data update is a commit, not a deployment.** Nobody touches the server, the
  HTML or the CSS to refresh numbers.

## 1. The data contract (five tables, keys intact)

The site mirrors the relational model rather than flattening it. One JSON file per
table, each an array of records; JSON field names are the table's column names,
lower-cased.

```
regions   (region_id PK, region_name)
site_types(type_id PK, type_name)
sites     (site_id PK, site_name, type_id FK -> site_types, region_id FK -> regions,
           lat, lon)
samples   (sample_id PK, site_id FK -> sites, sample_date, matrix)
methods   (method_id PK, method_name, lod, loq, lab)
results   (result_id PK, sample_id FK -> samples, method_id FK -> methods,
           analyte, value, unit, flag)
```

Example, `data/results.json`:

```json
[
  { "result_id": 1042, "sample_id": 88, "method_id": 3,
    "analyte": "6PPD-quinone", "value": 2140, "unit": "ng/L", "flag": "" }
]
```

Why not one flat table? Because flattening at export time throws away method IDs,
detection limits and QC flags: the fields the hub needs the moment someone asks "was
that below the LOD?" or "which lab ran it?". Instead `explore.js` joins the tables in
the browser (`flatten()`) into the row shape the charts already use:

```js
{ site, type, region, year, month, value }
```

Nothing in the chart, table or statistic code has to change when real data arrives.

**If the schema differs** (other table or column names, extra tables such as
`sites_meta` or `analytes`), rename at export time in the query, never in the JSON by
hand. The JSON must always be machine-generated.

## 2. Export

### Prefer a saved export query

In Access, build one query, e.g. `q_hub_export`, that:

- joins `results -> samples -> sites -> site_types / regions` (and `methods`)
- formats dates as ISO text: `Format([sample_date], "yyyy-mm-dd")`
- returns one row per result, with the foreign keys included

Save it, so column order and formats are identical on every run. Export the query,
not the raw tables.

### Option A: Python (exact types, real NULLs)

```powershell
python scripts\export_from_access.py --accdb "C:\path\6ppd-q.accdb" --out data\
```

Needs the Microsoft Access Database Engine (ODBC) driver plus `pyodbc`. This is the
recommended path: NULL stays NULL, numerics stay numeric, and the script can refuse
to write anything when a validation check fails.

> `scripts/export_from_access.py` does not exist yet. It gets written once the real
> table and column names are confirmed.

### Option B: from inside Access, no Python

Export the saved query to a delimited text file, then convert that file to JSON.

- **Manual:** External Data -> Export -> Text File, with *Export data with formatting
  and layout* **unchecked**, comma-delimited. Save the steps so they appear under
  "Saved Exports" and become a one-click action.
- **Repeatable:** a form button running
  `DoCmd.TransferText acExportDelim, "HubExportSpec", "q_hub_export", "C:\export\results.csv", True`
  The saved specification keeps quoting and delimiters stable across runs.

### Option C: still working from the five CSVs

Same rules: run them through the converter, never hand-edit the JSON. Do the join on
the foreign keys inside the converter so published files keep the relational shape.

## 3. Validate before publishing (never skip)

The export should **fail loudly** rather than publish a plausible-looking wrong
number. Minimum checks:

- [ ] `results` row count matches `SELECT COUNT(*) FROM results` in the source
- [ ] every `sample_id` in `results` exists in `samples` (no orphan foreign keys)
- [ ] no duplicate primary keys in any table
- [ ] every `value` is a positive number: no blanks, no `0`, no text
- [ ] **`unit` is `ng/L` everywhere.** ug/L results must be multiplied by 1000 at
      export; mixed units in one column is the classic way to publish a wrong chart
- [ ] every `sample_date` parses as `yyyy-mm-dd` and falls in a plausible range
- [ ] the date range and site count in the JSON look like what you expect

## 4. Publish

```powershell
git add data
git commit -m "data: export 2025-03-04 (1,204 results, 38 sites)"
git push origin main
```

Then open the live Explore page and confirm the "Data as of ..." stamp shows the new
date and the row count in the footer matches the export. Pages normally rebuilds
within a minute; hard-refresh (Ctrl+F5) if numbers look stale, because both the
browser and GitHub's CDN cache aggressively.

## 5. Access gotchas that will bite you

| Symptom | Cause | Fix |
| --- | --- | --- |
| Dates land in the wrong month | Access writes `M/D/YYYY`; `03/04/2025` is ambiguous | `Format([sample_date],"yyyy-mm-dd")` in the query |
| Numbers parse as text or truncate | Locale decimal comma | Keep `.` as the decimal separator; export as delimited text, not formatted |
| Empty cells appear as the text `NULL` | Export option writes the literal string | Export NULL as empty; have the converter treat `""` as null |
| Extra rows, duplicated values | Query fans out on a one-to-many join | Check result count against `COUNT(*)`; join on the full key |
| Records shift after a compaction | AutoNumber keys can be reassigned after compact/repair | Never expose AutoNumber as a citable ID; add a stable business key |
| Column values split across fields | Memo/Long Text with commas, quotes or line breaks | Quote all fields in the export spec, or go through pyodbc |
| Truncated long notes | Query truncates memo fields | Set the memo column to Long Text in the query's property sheet |
| Values 1000x off | Mixed ug/L and ng/L in one column | Normalise to ng/L at export |
| File corruption | `.accdb` on OneDrive/SharePoint sync or Wi-Fi share | Keep the live file on a local disk or wired share; sync copies for backup only |

## 6. How much automation do you want?

Pick the lowest level that matches your update rhythm.

- **Level 0, manual (about 5 minutes).** Run the export, run the converter, commit,
  push. Perfect for a dataset that changes monthly or less.
- **Level 1, one button.** A form button in Access runs the saved export; a
  `refresh-data.ps1` next to the repo runs the converter, validation and commit. Two
  clicks total.
- **Level 2, scheduled.** Windows Task Scheduler runs Level 1 nightly on a lab PC,
  committing only when the output changes. Keep an eye on it: silent failures are the
  usual outcome of unattended pipelines.
- **Level 3, GitHub Actions (recommended upgrade).** Commit the raw **CSV** instead of
  the JSON, and let a workflow run the converter plus validation on GitHub for every
  push. Benefits: validation runs in a clean environment, the JSON can never be
  hand-edited, and nobody needs Python installed locally. The site itself stays a
  plain static build.

Levels 0 to 2 need Python (or Access) on someone's machine; Level 3 does not.

## 7. Who does what

| Step | Owner | Output |
| --- | --- | --- |
| Edit and QC the tables | Data owner | Updated `.accdb` or CSVs |
| Run the export | Data owner | `data/*.json` |
| Sanity-check the diff and the live page | Reviewer (second pair of eyes) | Approved commit |
| Tag citable releases | Project lead | `git tag data-v1.0` and a DOI via Zenodo / OSF |

Tagging a release is worth the habit: it gives reviewers and other researchers a
fixed, citable snapshot even as the site keeps updating. The repository is already
public, so Zenodo can mint a DOI from a GitHub tag with no extra hosting.

## 8. Troubleshooting

| What you see | Likely cause | What to do |
| --- | --- | --- |
| Site shows old numbers | CDN or browser cache, or the push did not land | Hard-refresh; check `git status` and `git ls-remote origin refs/heads/main` |
| Chart is empty after a data change | JSON path typo, or the fetch failed (404) | Open the exact file URL, e.g. `/data/results.json`; check the browser console |
| Row count in the footer does not match Access | Export filtered rows, or a join fanned out | Re-run the count check from section 3 |
| Numbers are 1000x off | Mixed units | Normalise to ng/L at export |
| Only some sites appear | A `region_id` or `type_id` is null, so the join drops the row | Check for orphan/null foreign keys |
| A page 404s after a rename | GitHub Pages is case-sensitive | Match the file name casing exactly in links |

## 9. When to stop using a snapshot

Keep the snapshot method until one of these becomes true:

- data changes more than weekly, and rebuilding is a bottleneck
- reviewers need to see unpublished rows behind a login
- the dataset outgrows a few MB of shipped JSON, or users need arbitrary filtering
  over hundreds of thousands of rows

Then, and only then, put a real database behind an API (Postgres/Neon/Supabase, or
Cloudflare D1) and have the same static pages fetch JSON from it. The front end barely
changes: `loadData()` swaps a same-origin file read for a `fetch()` to the API. What you
take on is uptime, auth, CORS and cost. Not worth it before you need it.

## Related

- [README](../README.md): what the site is, page map, local preview
- `assets/js/explore.js`: `DATASET`, `REFERENCE`, the `gp` helpers and `VIEWS`
- `explore.html`: the public side, including the "adding an analysis" example
