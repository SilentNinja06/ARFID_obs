/** Chart rendering: inline SVG line chart and plain-div bars.
 * No chart libraries. Data color comes from CSS custom properties so light
 * and dark mode each get their validated ramp; text and grid use theme
 * variables so they stay recessive. */

export interface SeriesPoint {
	label: string; // axis / tooltip label
	value: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string>
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	return el;
}

/** Line chart with a pointer-driven tooltip (works for touch and mouse). */
export function renderLineChart(
	parent: HTMLElement,
	points: SeriesPoint[],
	unit: { singular: string; plural: string }
): void {
	const wrap = parent.createDiv({ cls: "arfid-chart-wrap" });
	if (points.length === 0) {
		wrap.createDiv({ cls: "arfid-empty", text: "No entries yet." });
		return;
	}

	const W = 640;
	const H = 200;
	const PAD = { top: 12, right: 12, bottom: 26, left: 30 };
	const iw = W - PAD.left - PAD.right;
	const ih = H - PAD.top - PAD.bottom;
	const max = Math.max(1, ...points.map((p) => p.value));
	// round the axis top up to a friendly value
	const top = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

	const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
	const y = (v: number) => PAD.top + ih - (v / top) * ih;

	const svg = svgEl("svg", {
		viewBox: `0 0 ${W} ${H}`,
		class: "arfid-linechart",
		role: "img",
	});
	svg.setAttr("aria-label", `${unit.plural} over time`);

	// recessive gridlines + y labels (0, half, top)
	for (const v of [0, top / 2, top]) {
		const gy = y(v);
		svg.appendChild(
			svgEl("line", { x1: String(PAD.left), x2: String(W - PAD.right), y1: String(gy), y2: String(gy), class: "arfid-grid" })
		);
		const t = svgEl("text", { x: String(PAD.left - 6), y: String(gy + 3), class: "arfid-axis-label", "text-anchor": "end" });
		t.textContent = String(v % 1 === 0 ? v : v.toFixed(1));
		svg.appendChild(t);
	}

	// x labels: first, middle, last
	const labelIdx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
	for (const i of labelIdx) {
		const t = svgEl("text", {
			x: String(x(i)),
			y: String(H - 8),
			class: "arfid-axis-label",
			"text-anchor": i === 0 ? "start" : i === points.length - 1 ? "end" : "middle",
		});
		t.textContent = points[i].label;
		svg.appendChild(t);
	}

	const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
	svg.appendChild(svgEl("path", { d: path, class: "arfid-line" }));

	// hover marker (2px surface ring via CSS)
	const dot = svgEl("circle", { r: "4.5", class: "arfid-dot", style: "display:none" });
	svg.appendChild(dot);

	wrap.appendChild(svg);
	const tooltip = wrap.createDiv({ cls: "arfid-tooltip" });
	tooltip.style.display = "none";

	const show = (clientX: number) => {
		const rect = svg.getBoundingClientRect();
		const relX = ((clientX - rect.left) / rect.width) * W;
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < points.length; i++) {
			const d = Math.abs(x(i) - relX);
			if (d < bestD) {
				bestD = d;
				best = i;
			}
		}
		const p = points[best];
		dot.setAttribute("cx", String(x(best)));
		dot.setAttribute("cy", String(y(p.value)));
		dot.style.display = "";
		tooltip.setText(`${p.label} — ${p.value} ${p.value === 1 ? unit.singular : unit.plural}`);
		tooltip.style.display = "";
		const px = (x(best) / W) * rect.width;
		tooltip.style.left = `${Math.min(Math.max(px, 50), rect.width - 50)}px`;
	};
	svg.addEventListener("pointermove", (ev) => show(ev.clientX));
	svg.addEventListener("pointerdown", (ev) => show(ev.clientX));
	svg.addEventListener("pointerleave", () => {
		dot.style.display = "none";
		tooltip.style.display = "none";
	});
}

export interface BarRow {
	label: string;
	value: number;
	/** extra text shown at the end of the row, e.g. a success rate */
	detail?: string;
	/** 0..1, drawn as a filled portion of the bar when provided */
	fraction?: number;
}

/** Horizontal bars from plain divs: thin marks, rounded data ends, labels in
 * text tokens (never the series color). */
export function renderBars(parent: HTMLElement, rows: BarRow[], emptyText: string): void {
	const wrap = parent.createDiv({ cls: "arfid-bars" });
	if (rows.length === 0) {
		wrap.createDiv({ cls: "arfid-empty", text: emptyText });
		return;
	}
	const max = Math.max(1, ...rows.map((r) => r.value));
	for (const r of rows) {
		const row = wrap.createDiv({ cls: "arfid-bar-row" });
		const labelRow = row.createDiv({ cls: "arfid-bar-labels" });
		labelRow.createSpan({ cls: "arfid-bar-name", text: r.label });
		labelRow.createSpan({
			cls: "arfid-bar-value",
			text: r.detail ? `${r.value} · ${r.detail}` : String(r.value),
		});
		const track = row.createDiv({ cls: "arfid-bar-track" });
		const bar = track.createDiv({ cls: "arfid-bar-fill" });
		bar.style.width = `${Math.max(2, (r.value / max) * 100)}%`;
		if (r.fraction !== undefined) {
			const inner = bar.createDiv({ cls: "arfid-bar-fraction" });
			inner.style.width = `${Math.round(r.fraction * 100)}%`;
		}
	}
}
