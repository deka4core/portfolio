// metro-map.jsx — data-driven SVG transit map.
// Lines are generated from PORTFOLIO_DATA via Catmull-Rom smoothing so the
// "curve intensity" tweak can reshape them live. Newest stations at top.
(function () {
  const VB_W = 960, VB_H = 1160;
  const TOP_Y = 200, GAP = 205, AMP = 36;

  function lineLayout(line, li, curve) {
    const meanX = 230 + li * 215;
    const yOff = li * 28;
    const pts = line.stations.map((st, si) => ({
      x: meanX + curve * AMP * Math.sin(si * 0.95 + li * 0.7) + si * 9,
      y: TOP_Y + si * GAP + yOff,
      st, si,
    }));
    if (pts.length < 2) {
      // single station — synthesize a dummy ext point above it
      const first = pts[0];
      const ext = { x: first.x, y: first.y - 175 };
      return { meanX, pts, ext };
    }
    const first = pts[0], second = pts[1];
    const ext = { x: first.x + (first.x - second.x) * 0.6, y: first.y - 175 };
    return { meanX, pts, ext };
  }

  function catmullSegs(points) {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || points[i + 1];
      segs.push({
        p1,
        c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
        c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
        p2,
      });
    }
    return segs;
  }
  function segsToPath(segs) {
    if (!segs.length) return "";
    let d = `M ${segs[0].p1.x.toFixed(1)} ${segs[0].p1.y.toFixed(1)}`;
    for (const s of segs)
      d += ` C ${s.c1.x.toFixed(1)} ${s.c1.y.toFixed(1)} ${s.c2.x.toFixed(1)} ${s.c2.y.toFixed(1)} ${s.p2.x.toFixed(1)} ${s.p2.y.toFixed(1)}`;
    return d;
  }

  function wrap(name) {
    if (name.length <= 15) return [name];
    const words = name.split(" ");
    const lines = ["", ""];
    let idx = 0;
    for (const w of words) {
      if (idx === 0 && (lines[0] + " " + w).trim().length > 13) idx = 1;
      lines[idx] = (lines[idx] + " " + w).trim();
    }
    return lines[1] ? lines : [lines[0]];
  }

  function MetroMap({ data, colors, curve, stationStyle, animate, lang, selected, onHover, onSelect }) {
    const { useState, useEffect } = React;
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    const yahText = data.ui.youAreHere[lang];
    const lines = data.lines
      .map((ln) => ({
        ...ln,
        // newest at top (highest year first), then by original order
        stations: (ln.stations || []).slice().sort((a, b) => (b.year || "0").localeCompare(a.year || "0")),
      }))
      .filter((ln) => ln.stations.length > 0)
      .map((ln, li) => ({ ln, li, ...lineLayout(ln, li, curve) }));
    // JS-driven reveal: target state is always visible, so it can never get stuck hidden.
    const [shown, setShown] = useState(!animate);
    useEffect(() => {
      if (!animate) { setShown(true); return; }
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      const t = setTimeout(() => setShown(true), 400); // fallback: fires even when tab is backgrounded
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }, [animate]);
    const draw = animate && !shown;

    return (
      <svg className="metro-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" aria-label="Project map">
        <defs>
          <linearGradient id="trackFade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={VB_H}>
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.07" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.86" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="trackFadeMask" maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#trackFade)" />
          </mask>
        </defs>
        <g mask="url(#trackFadeMask)">
        {lines.map(({ ln, li, pts, ext }) => {
          const color = colors[ln.id];
          const segs = catmullSegs([ext, ...pts]);
          const solidD = segsToPath(segs.slice(2));
          const dashedD = segsToPath(segs.slice(0, 2));
          return (
            <g key={ln.id}>
              <path d={solidD} className="track-casing" fill="none" />
              <path d={solidD} className="track-solid" fill="none" pathLength="1"
                style={{
                  stroke: color,
                  strokeDasharray: animate ? 1 : "none",
                  strokeDashoffset: draw ? 1 : 0,
                  transition: animate ? "stroke-dashoffset 1.6s cubic-bezier(.5,0,.2,1)" : "none",
                  transitionDelay: `${li * 0.18}s`,
                }} />
              <path d={dashedD} className="track-dashed" fill="none"
                style={{
                  stroke: color,
                  opacity: draw ? 0 : 0.9,
                  transition: animate ? "opacity .9s ease" : "none",
                  transitionDelay: `${0.9 + li * 0.18}s`,
                }} />
            </g>
          );
        })}
        </g>

        {lines.map(({ ln, li, pts }) =>
          pts.map((p) => {
            const color = colors[ln.id];
            const st = p.st;
            const stName = tr(st.name);
            const isSel = selected === st.id;
            const labelLines = wrap(stName);
            const lx = p.x + 22;
            const delay = 0.5 + li * 0.18 + p.si * 0.12;
            return (
              <g key={st.id} className="station"
                style={{
                  opacity: draw ? 0 : 1,
                  transform: draw ? "scale(.4)" : "scale(1)",
                  transformOrigin: `${p.x}px ${p.y}px`,
                  transition: animate ? "opacity .5s ease, transform .55s cubic-bezier(.2,.85,.3,1.25)" : "none",
                  transitionDelay: `${delay}s`,
                }}
                onClick={() => onSelect(st.id)}
                onMouseEnter={(e) => onHover({ station: st, line: ln, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => onHover({ station: st, line: ln, x: e.clientX, y: e.clientY })}                onMouseLeave={() => onHover(null)}>
                <circle className="hit" cx={p.x} cy={p.y} r="22" />
                {st.status === "current" && <circle className="pulse" cx={p.x} cy={p.y} r="10" style={{ stroke: color }} />}
                {isSel && <circle className="sel-ring" cx={p.x} cy={p.y} r="16" style={{ stroke: color }} />}
                {st.status === "future" ? (
                  <circle cx={p.x} cy={p.y} r="7.5" className="dot-future" style={{ stroke: color }} />
                ) : st.status === "current" ? (
                  <circle cx={p.x} cy={p.y} r="9" className="dot-current" style={{ fill: color }} />
                ) : stationStyle === "filled" ? (
                  <circle cx={p.x} cy={p.y} r="6.5" className="dot-filled" style={{ fill: color }} />
                ) : stationStyle === "tick" ? (
                  <rect x={p.x - 2.4} y={p.y - 11} width="4.8" height="22" rx="2.4" className="dot-tick" style={{ fill: color }} />
                ) : (
                  <circle cx={p.x} cy={p.y} r="6.5" className="dot-ring" style={{ stroke: color }} />
                )}
                {st.youAreHere && (
                  <g className="yah" transform={`translate(${lx}, ${p.y + (labelLines.length > 1 ? 48 : 30)})`}>
                    <rect width="116" height="25" rx="12.5" className="yah-pill" style={{ fill: color }} />
                    <text x="58" y="16.5" className="yah-text">{yahText}</text>
                  </g>
                )}
                <text x={lx} y={p.y - (labelLines.length > 1 ? 5 : 1)} className={"st-name" + (isSel ? " on" : "")}>
                  {labelLines.length > 1 ? (
                    <>
                      <tspan x={lx} dy="0">{labelLines[0]}</tspan>
                      <tspan x={lx} dy="20">{labelLines[1]}</tspan>
                    </>
                  ) : labelLines[0]}
                </text>
                <text x={lx} y={p.y + (labelLines.length > 1 ? 35 : 17)} className="st-meta">{st.year} · {st.stack[0]}</text>              </g>
            );
          })
        )}
      </svg>
    );
  }

  window.MetroMap = MetroMap;
})();