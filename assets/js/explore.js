/* =========================================================
   6PPD-Q Data Hub — explore page engine
   No dependencies. Reads DATASET, filters it, and renders
   charts/tables with small "premade functions".
   Replace DATASET with a real export when it is ready.
   ========================================================= */

/* ---- 1. DATA ---------------------------------------------------------
   Illustrative sample rows only (layout preview, not literature values).
   Swap this block for your real measurements, same shape:
   { site, type, region, year, month, value }   value = ng/L of 6PPD-Q
---------------------------------------------------------------------- */
const DATASET = {
  label: "Illustrative sample · not citable",
  unit: "ng/L",
  rows: [
    { site: "SR-520 stormwater", type: "Road runoff", region: "Puget Sound", year: 2022, month: 1, value: 1820 },
    { site: "SR-520 stormwater", type: "Road runoff", region: "Puget Sound", year: 2022, month: 4, value: 2140 },
    { site: "I-5 outfall", type: "Road runoff", region: "Puget Sound", year: 2022, month: 2, value: 1260 },
    { site: "I-5 outfall", type: "Road runoff", region: "Puget Sound", year: 2022, month: 11, value: 1585 },
    { site: "Aurora Ave N", type: "Road runoff", region: "Puget Sound", year: 2022, month: 3, value: 940 },
    { site: "Aurora Ave N", type: "Road runoff", region: "Puget Sound", year: 2022, month: 12, value: 1130 },
    { site: "Longfellow Creek", type: "Receiving water", region: "Puget Sound", year: 2022, month: 1, value: 210 },
    { site: "Longfellow Creek", type: "Receiving water", region: "Puget Sound", year: 2022, month: 4, value: 265 },
    { site: "Piper's Creek", type: "Receiving water", region: "Puget Sound", year: 2022, month: 2, value: 88 },
    { site: "Piper's Creek", type: "Receiving water", region: "Puget Sound", year: 2022, month: 5, value: 132 },
    { site: "Thornton Creek", type: "Receiving water", region: "Puget Sound", year: 2022, month: 3, value: 41 },
    { site: "Magnuson pond", type: "Stormwater pond", region: "Puget Sound", year: 2022, month: 2, value: 62 },
    { site: "Magnuson pond", type: "Stormwater pond", region: "Puget Sound", year: 2022, month: 7, value: 24 },
    { site: "Green Lake swale", type: "Stormwater pond", region: "Puget Sound", year: 2022, month: 6, value: 118 },
    { site: "Sacramento River", type: "Receiving water", region: "California", year: 2023, month: 2, value: 34 },
    { site: "Sacramento River", type: "Receiving water", region: "California", year: 2023, month: 9, value: 16 },
    { site: "San Diego Creek", type: "Receiving water", region: "California", year: 2023, month: 3, value: 58 },
    { site: "LA River outfall", type: "Road runoff", region: "California", year: 2023, month: 1, value: 705 },
    { site: "LA River outfall", type: "Road runoff", region: "California", year: 2023, month: 11, value: 812 },
    { site: "Fresno retention basin", type: "Stormwater pond", region: "California", year: 2023, month: 5, value: 44 },
    { site: "Ship Creek", type: "Receiving water", region: "Alaska", year: 2023, month: 6, value: 9 },
    { site: "Campbell Creek", type: "Receiving water", region: "Alaska", year: 2023, month: 7, value: 14 },
    { site: "Anchorage outfall", type: "Road runoff", region: "Alaska", year: 2023, month: 8, value: 388 },
    { site: "Detroit WWTP effluent", type: "Wastewater effluent", region: "Great Lakes", year: 2022, month: 4, value: 73 },
    { site: "Milwaukee WWTP effluent", type: "Wastewater effluent", region: "Great Lakes", year: 2022, month: 5, value: 41 },
    { site: "Tread leachate (lab)", type: "Tire leachate (lab)", region: "Laboratory", year: 2022, month: 6, value: 8600 }
  ]
};

/* Reference line used by the exploratory views (coho salmon acute
   toxicity threshold, approx. from published literature). */
const REFERENCE = { value: 95, label: "Coho acute toxicity threshold (~95 ng/L)" };

/* ---- 2. PREMADE HELPER FUNCTIONS ------------------------------------- */

const gp = {
  filter(rows, { region = "all", type = "all" } = {}) {
    return rows.filter((r) =>
      (region === "all" || r.region === region) &&
      (type === "all" || r.type === type)
    );
  },
  mean(values) {
    if (!values.length) return NaN;
    return values.reduce((a, b) => a + b, 0) / values.length;
  },
  median(values) {
    if (!values.length) return NaN;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  },
  groupBy(rows, keyFn) {
    return rows.reduce((acc, row) => {
      const key = keyFn(row);
      (acc[key] || (acc[key] = [])).push(row);
      return acc;
    }, {});
  },
  summary(rows, keyFn) {
    const groups = gp.groupBy(rows, keyFn);
    return Object.entries(groups)
      .map(([name, group]) => {
        const values = group.map((r) => r.value);
        return {
          name,
          n: values.length,
          median: gp.median(values),
          mean: gp.mean(values),
          max: Math.max(...values),
          overRef: values.filter((v) => v > REFERENCE.value).length / values.length
        };
      })
      .sort((a, b) => b.median - a.median);
  },
  fmt(value, digits = 0) {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  },
  csv(rows) {
    const head = ["site", "type", "region", "year", "month", "value_ng_L"];
    const body = rows.map((r) => [r.site, r.type, r.region, r.year, r.month, r.value]);
    return [head, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }
};

/* ---- 3. TINY SVG CHART BUILDERS -------------------------------------- */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text !== undefined) el.textContent = text;
  return el;
}

function emptyState(svg, width, height, message) {
  svg.appendChild(
    svgEl("text", { x: width / 2, y: height / 2, class: "chart__empty", "text-anchor": "middle" }, message)
  );
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => s * magnitude >= value) || 10;
  return step * magnitude;
}

function truncated(label, max = 32) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/* Horizontal bar chart: items = [{ label, value, alt }] */
function barChart(target, items, { unit = "", ref = null, digits = 0 } = {}) {
  const width = 720;
  const rowH = 34;
  const top = 26;
  const bottom = 30;
  const labelW = 214;
  const valueW = 74;
  const height = top + bottom + Math.max(items.length, 1) * rowH;
  const plotW = width - labelW - valueW;

  const svg = svgEl("svg", {
    class: "chart",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": `Bar chart of ${items.length} categories`
  });

  if (!items.length) {
    emptyState(svg, width, height, "No measurements match these filters.");
    target.replaceChildren(svg);
    return;
  }

  const max = niceMax(Math.max(...items.map((d) => d.value), ref ? ref.value : 0));

  // gridlines + ticks
  for (let i = 0; i <= 4; i += 1) {
    const x = labelW + (plotW * i) / 4;
    svg.appendChild(svgEl("line", { class: "chart__grid", x1: x, y1: top, x2: x, y2: height - bottom }));
    svg.appendChild(
      svgEl(
        "text",
        { class: "chart__tick", x, y: height - bottom + 16, "text-anchor": "middle" },
        gp.fmt((max * i) / 4, digits)
      )
    );
  }
  svg.appendChild(svgEl("line", { class: "chart__axis", x1: labelW, y1: top, x2: labelW, y2: height - bottom }));

  items.forEach((item, index) => {
    const y = top + index * rowH;
    const barH = rowH - 12;
    const barW = Math.max((item.value / max) * plotW, 2);

    svg.appendChild(
      svgEl("text", { class: "chart__label", x: labelW - 12, y: y + barH / 2 + 4, "text-anchor": "end" }, truncated(item.label))
    );
    svg.appendChild(
      svgEl("rect", {
        class: item.alt ? "chart__bar chart__bar--alt" : "chart__bar",
        x: labelW,
        y,
        width: barW,
        height: barH,
        rx: 3
      })
    );
    const valueLabel = `${gp.fmt(item.value, digits)}${unit ? ` ${unit}` : ""}`;
    const inside = barW > plotW * 0.62;
    svg.appendChild(
      svgEl(
        "text",
        {
          class: inside ? "chart__value chart__value--in" : "chart__value",
          x: inside ? labelW + barW - 8 : labelW + barW + 8,
          y: y + barH / 2 + 4,
          "text-anchor": inside ? "end" : "start"
        },
        valueLabel
      )
    );
  });

  if (ref) {
    const refX = labelW + (ref.value / max) * plotW;
    if (refX < labelW + plotW) {
      const label = truncated(ref.label, 38);
      const fitsRight = refX + 8 + label.length * 5.6 < width - 6;
      svg.appendChild(svgEl("line", { class: "chart__ref", x1: refX, y1: top, x2: refX, y2: height - bottom }));
      svg.appendChild(
        svgEl(
          "text",
          {
            class: "chart__ref-label",
            x: fitsRight ? refX + 7 : refX - 7,
            y: top - 9,
            "text-anchor": fitsRight ? "start" : "end"
          },
          label
        )
      );
    }
  }

  target.replaceChildren(svg);
}

/* Line chart: points = [{ x: "Jan", y: 120 }] */
function lineChart(target, points, { unit = "", ref = null, digits = 0 } = {}) {
  const width = 720;
  const height = 320;
  const padLeft = 54;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const svg = svgEl("svg", {
    class: "chart",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Line chart"
  });

  const usable = points.filter((p) => Number.isFinite(p.y));
  if (!usable.length) {
    emptyState(svg, width, height, "No measurements match these filters.");
    target.replaceChildren(svg);
    return;
  }

  const max = niceMax(Math.max(...usable.map((p) => p.y), ref ? ref.value : 0));

  for (let i = 0; i <= 4; i += 1) {
    const y = padTop + (plotH * i) / 4;
    svg.appendChild(svgEl("line", { class: "chart__grid", x1: padLeft, y1: y, x2: width - padRight, y2: y }));
    svg.appendChild(
      svgEl(
        "text",
        { class: "chart__tick", x: padLeft - 10, y: y + 4, "text-anchor": "end" },
        gp.fmt((max * (4 - i)) / 4, digits)
      )
    );
  }
  svg.appendChild(svgEl("line", { class: "chart__axis", x1: padLeft, y1: height - padBottom, x2: width - padRight, y2: height - padBottom }));

  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const posFor = (index, value) => ({
    x: padLeft + (points.length > 1 ? index * stepX : plotW / 2),
    y: padTop + plotH - (value / max) * plotH
  });

  if (ref) {
    const refY = padTop + plotH - (ref.value / max) * plotH;
    svg.appendChild(svgEl("line", { class: "chart__ref", x1: padLeft, y1: refY, x2: width - padRight, y2: refY }));
    svg.appendChild(
      svgEl(
        "text",
        { class: "chart__ref-label", x: width - padRight, y: refY - 7, "text-anchor": "end" },
        truncated(ref.label, 42)
      )
    );
  }

  const pathData = points
    .map((p, index) => (Number.isFinite(p.y) ? { ...posFor(index, p.y), ok: true } : { ok: false }))
    .filter((p) => p.ok)
    .map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  svg.appendChild(svgEl("path", { class: "chart__line", d: pathData }));

  points.forEach((point, index) => {
    if (!Number.isFinite(point.y)) return;
    const { x, y } = posFor(index, point.y);
    svg.appendChild(svgEl("circle", { class: "chart__dot", cx: x, cy: y, r: 4.5 }));
    svg.appendChild(svgEl("text", { class: "chart__tick", x, y: height - padBottom + 18, "text-anchor": "middle" }, point.x));
  });

  target.replaceChildren(svg);
}

/* ---- 4. PREMADE ANALYSES --------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const VIEWS = {
  summary: {
    tab: "Summary by site type",
    chart(rows, target) {
      const stats = gp.summary(rows, (r) => r.type);
      barChart(target, stats.map((s) => ({ label: s.name, value: s.median })), { unit: "ng/L", ref: REFERENCE });
      return {
        caption: "Median 6PPD-quinone concentration per site type, with the coho reference line.",
        head: [
          { label: "Site type" },
          { label: "n", num: true },
          { label: "Median (ng/L)", num: true },
          { label: "Mean (ng/L)", num: true },
          { label: "Max (ng/L)", num: true },
          { label: "> 95 ng/L", num: true }
        ],
        body: stats.map((s) => [
          s.name, s.n, gp.fmt(s.median), gp.fmt(s.mean), gp.fmt(s.max), `${gp.fmt(s.overRef * 100)}%`
        ])
      };
    }
  },

  top: {
    tab: "Highest sites",
    chart(rows, target) {
      const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 8);
      barChart(
        target,
        top.map((r) => ({
          label: `${r.site} · ${MONTHS[r.month - 1]} ${r.year}`,
          value: r.value,
          alt: r.value > REFERENCE.value
        })),
        { unit: "ng/L", ref: REFERENCE }
      );
      return {
        caption: "The eight highest single measurements in the current selection (orange = above reference).",
        head: [
          { label: "Site" },
          { label: "Type" },
          { label: "Region" },
          { label: "Date" },
          { label: "6PPD-Q (ng/L)", num: true }
        ],
        body: top.map((r) => [r.site, r.type, r.region, `${MONTHS[r.month - 1]} ${r.year}`, gp.fmt(r.value)])
      };
    }
  },

  seasonal: {
    tab: "Seasonal pattern",
    chart(rows, target) {
      const byMonth = gp.groupBy(rows, (r) => r.month);
      const points = MONTHS.map((label, i) => {
        const group = byMonth[i + 1];
        return { x: label, y: group && group.length ? gp.median(group.map((r) => r.value)) : NaN };
      });
      lineChart(target, points, { unit: "ng/L", ref: REFERENCE });
      return {
        caption: "Median concentration by calendar month across the current selection.",
        head: [
          { label: "Month" },
          { label: "n", num: true },
          { label: "Median (ng/L)", num: true },
          { label: "Max (ng/L)", num: true }
        ],
        body: MONTHS.map((label, i) => {
          const values = (byMonth[i + 1] || []).map((r) => r.value);
          return [
            label,
            values.length,
            values.length ? gp.fmt(gp.median(values)) : "—",
            values.length ? gp.fmt(Math.max(...values)) : "—"
          ];
        })
      };
    }
  },

  exceedance: {
    tab: "Threshold exceedance",
    chart(rows, target) {
      const stats = gp.summary(rows, (r) => r.type);
      barChart(
        target,
        stats
          .map((s) => ({ label: s.name, value: s.overRef * 100, alt: s.overRef > 0.5 }))
          .sort((a, b) => b.value - a.value),
        { unit: "%", digits: 0 }
      );
      return {
        caption: "Share of samples above the coho reference threshold, by site type.",
        head: [
          { label: "Site type" },
          { label: "n", num: true },
          { label: "Above threshold", num: true },
          { label: "Share", num: true }
        ],
        body: stats.map((s) => [s.name, s.n, Math.round(s.overRef * s.n), `${gp.fmt(s.overRef * 100)}%`])
      };
    }
  }
};

/* ---- 5. RENDERING + WIRING ------------------------------------------- */

const state = { region: "all", type: "all", view: "summary" };

function filteredRows() {
  return gp.filter(DATASET.rows, { region: state.region, type: state.type });
}

function renderKpis(rows) {
  const values = rows.map((r) => r.value);
  const sites = new Set(rows.map((r) => r.site));
  const over = values.filter((v) => v > REFERENCE.value).length;
  const cards = [
    { value: gp.fmt(rows.length), label: "samples in selection" },
    { value: gp.fmt(sites.size), label: "distinct sites" },
    { value: gp.fmt(gp.median(values)), label: "median (ng/L)" },
    { value: gp.fmt(values.length ? Math.max(...values) : NaN), label: "maximum (ng/L)" },
    {
      value: values.length ? `${gp.fmt((over / values.length) * 100)}%` : "—",
      label: `above ${REFERENCE.value} ng/L reference`
    }
  ];

  const frag = document.createDocumentFragment();
  cards.forEach((card) => {
    const box = document.createElement("div");
    box.className = "stat";
    const value = document.createElement("span");
    value.className = "stat__value";
    value.textContent = card.value;
    const label = document.createElement("span");
    label.className = "stat__label";
    label.textContent = card.label;
    box.append(value, label);
    frag.appendChild(box);
  });
  document.querySelector("#kpis").replaceChildren(frag);
}

function renderTable(target, head, body, caption) {
  const table = document.createElement("table");
  if (caption) {
    const cap = document.createElement("caption");
    cap.textContent = caption;
    table.appendChild(cap);
  }
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  head.forEach((col) => {
    const th = document.createElement("th");
    th.scope = "col";
    if (col.num) th.className = "num";
    th.textContent = col.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  body.forEach((cells) => {
    const tr = document.createElement("tr");
    cells.forEach((cell, index) => {
      const td = document.createElement("td");
      if (head[index] && head[index].num) td.className = "num";
      td.textContent = String(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  target.replaceChildren(table);
}

function render() {
  const rows = filteredRows();
  const view = VIEWS[state.view];
  const chartTarget = document.querySelector("#chart");
  const captionEl = document.querySelector("#chart-caption");

  const result = view.chart(rows, chartTarget);
  captionEl.textContent = result.caption;
  renderTable(
    document.querySelector("#table-target"),
    result.head,
    result.body,
    "Supporting table for the current selection"
  );
  renderKpis(rows);

  document.querySelector("#selection-count").textContent =
    `${rows.length} of ${DATASET.rows.length} sample rows shown · ${DATASET.label}`;

  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.view === state.view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
}

function fillSelect(select, values, allLabel) {
  const options = [allLabel, ...Array.from(new Set(values)).sort()];
  select.replaceChildren(
    ...options.map((value, index) => {
      const option = document.createElement("option");
      option.value = index === 0 ? "all" : value;
      option.textContent = value;
      return option;
    })
  );
}

function init() {
  const regionSelect = document.querySelector("#region-select");
  const typeSelect = document.querySelector("#type-select");
  const params = new URLSearchParams(window.location.search);

  fillSelect(regionSelect, DATASET.rows.map((r) => r.region), "All regions");
  fillSelect(typeSelect, DATASET.rows.map((r) => r.type), "All site types");

  // Shareable state: explore.html?view=seasonal&region=Puget%20Sound
  const applied = (select, key) => {
    const value = params.get(key);
    if (value && Array.from(select.options).some((option) => option.value === value)) {
      select.value = value;
    }
    return select.value;
  };
  state.region = applied(regionSelect, "region");
  state.type = applied(typeSelect, "type");
  if (VIEWS[params.get("view")]) state.view = params.get("view");

  regionSelect.addEventListener("change", () => {
    state.region = regionSelect.value;
    render();
  });
  typeSelect.addEventListener("change", () => {
    state.type = typeSelect.value;
    render();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.view = tab.dataset.view;
      render();
    });
  });

  document.querySelector("#download-csv").addEventListener("click", () => {
    const blob = new Blob([gp.csv(filteredRows())], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "6ppd-q-selection.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  render();
}

if (document.querySelector("#chart")) init();



