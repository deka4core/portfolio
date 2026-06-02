// certificates-view.jsx — certificates / achievements, grouped by type.
// Cards show an image placeholder until a real scan path is set in
// PORTFOLIO_DATA.certificates (item.img). Click a card for a closer look.
(function () {
  const { useState, useEffect } = React;

  // First letters of the issuer -> a faux seal monogram on the placeholder.
  function monogram(issuer) {
    const words = (issuer || "")
      .replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "—";
  }

  function Preview({ item, issuer, color, hint, large }) {
    if (item.img) return <img className="ccard-img" src={item.img} alt={issuer} />;
    return (
      <div className="ccard-ph">
        <span className="ph-frame" />
        <span className={"cert-seal" + (large ? " lg" : "")} style={{ borderColor: color, color }}>
          {monogram(issuer)}
        </span>
        <span className="ph-hint">{hint}</span>
      </div>
    );
  }

  function EmptyGroup({ code, color, lang, ui }) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    const sub = (ui.emptyHints && ui.emptyHints[code.id]) || ui.emptyDefault;
    return (
      <div className="cert-empty">
        <span className="ce-frame" />
        <div className="ce-art" style={{ color }}>
          <span className="ce-seg" />
          <span className="ce-mini" />
          <span className="ce-seg" />
          <span className="ce-roundel">{code.label}</span>
          <span className="ce-seg" />
          <span className="ce-mini" />
          <span className="ce-seg" />
        </div>
        <div className="ce-text">
          <div className="ce-title">{tr(ui.emptyTitle)}</div>
          <div className="ce-sub">{tr(sub)}</div>
        </div>
      </div>
    );
  }

  function CertificatesView({ data, colors, lang }) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    const ui = data.ui;
    const certs = data.certificates;
    const [active, setActive] = useState(null); // { item, color }

    useEffect(() => {
      if (!active) return;
      const onKey = (e) => { if (e.key === "Escape") setActive(null); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [active]);

    return (
      <div className="certs">
        <header className="details-head">
          <h2 className="details-title">{tr(ui.certsTitle)}</h2>
          <p className="details-sub">{tr(ui.certsSub)}</p>
        </header>

        {certs.groups.map((g) => {
          const color = colors[g.colorKey];
          return (
            <section className="cert-group" key={g.id}>
              <div className="cert-group-head">
                <span className="track-roundel" style={{ background: color }}>{g.code}</span>
                <div className="cert-group-titles">
                  <div className="cert-group-name">{tr(g.name)}</div>
                  <div className="cert-group-meta">{tr(g.sub)}</div>
                </div>
                <span className="cert-count">{g.items.length} {tr(ui.certCount)}</span>
              </div>

              <div className="cert-grid">
                {g.items.length === 0 ? (
                  <EmptyGroup code={{ id: g.id, label: g.code }} color={color} lang={lang} ui={ui} />
                ) : g.items.map((item) => {
                  const issuer = tr(item.issuer);
                  return (
                    <article
                      className="ccard"
                      key={item.id}
                      onClick={() => setActive({ item, color })}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive({ item, color }); } }}
                    >
                      <span className="ccard-bar" style={{ background: color }} />
                      <div className="ccard-preview">
                        <Preview item={item} issuer={issuer} color={color} hint={tr(ui.certHint)} />
                      </div>
                      <div className="ccard-body">
                        <h3 className="ccard-name">{tr(item.title)}</h3>
                        <div className="ccard-meta">{issuer} · {item.year}</div>
                        {item.cred && <div className="ccard-cred" style={{ color }}>{tr(item.cred)}</div>}
                        {item.skills && item.skills.length > 0 && (
                          <div className="pcard-tags ccard-tags">
                            {item.skills.map((s) => <span className="tag" key={s}>{s}</span>)}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {active && (
          <div className="cert-modal" onClick={() => setActive(null)}>
            <div className="cert-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="cert-modal-close" onClick={() => setActive(null)} aria-label={tr(ui.certClose)}>✕</button>
              <span className="ccard-bar" style={{ background: active.color }} />
              <div className="cert-modal-preview">
                <Preview item={active.item} issuer={tr(active.item.issuer)} color={active.color} hint={tr(ui.certHint)} large />
              </div>
              <div className="cert-modal-body">
                <h3 className="cert-modal-name">{tr(active.item.title)}</h3>
                <div className="ccard-meta">{tr(active.item.issuer)} · {active.item.year}</div>
                {active.item.cred && <div className="ccard-cred" style={{ color: active.color }}>{tr(active.item.cred)}</div>}
                {active.item.skills && active.item.skills.length > 0 && (
                  <div className="pcard-tags ccard-tags">
                    {active.item.skills.map((s) => <span className="tag" key={s}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.CertificatesView = CertificatesView;
})();
