// details-view.jsx — project ledger grouped by line, plus a full project modal.
// Cards link to GitHub and open a description modal with image/GIF previews.
(function () {
  const { useState, useEffect } = React;

  function GhIcon({ size = 14 }) {
    return (
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  }

  const repoUrlFor = (data, id) => (data.repos[id] ? data.repoBase + data.repos[id] : null);

  // Media for a project: explicit st.media wins; otherwise placeholders by status.
  function mediaFor(st) {
    if (st.media && st.media.length) return st.media;
    if (st.status === "future") return [{ type: "concept" }];
    return [{ type: "gif" }, { type: "image" }, { type: "image" }];
  }

  function MediaFrame({ item, color, lang, ui, big }) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    if (item.src) {
      return <img className="pm-img" src={item.src} alt={tr(item.caption) || ""} />;
    }
    const hint = item.type === "gif" ? tr(ui.mediaGif) : item.type === "concept" ? tr(ui.mediaConcept) : tr(ui.mediaShot);
    return (
      <div className={"pm-ph" + (big ? " big" : "")}>
        <span className="pm-frame" />
        <span className="pm-badge" style={{ borderColor: color, color }}>
          {item.type === "gif" ? <span className="pm-play" /> : item.type === "concept" ? "◇" : <span className="pm-imgicon" />}
        </span>
        <span className="pm-hint">{hint}</span>
      </div>
    );
  }

  function statusLabel(status, ui, lang) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    return status === "future" ? tr(ui.statusPlanned) : status === "current" ? tr(ui.statusCurrent) : tr(ui.statusShipped);
  }

  // ---------- project modal ----------
  function ProjectModal({ entry, data, colors, lang, onClose }) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    const ui = data.ui;
    const { st, ln } = entry;
    const color = colors[ln.id];
    const media = mediaFor(st);
    const [idx, setIdx] = useState(0);
    const repoUrl = repoUrlFor(data, st.id);

    useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const cur = media[Math.min(idx, media.length - 1)];

    return (
      <div className="cert-modal" onClick={onClose}>
        <div className="cert-modal-card proj-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="cert-modal-close" onClick={onClose} aria-label="Close">✕</button>
          <span className="ccard-bar" style={{ background: color }} />

          <div className="pm-stage">
            <MediaFrame item={cur} color={color} lang={lang} ui={ui} big />
          </div>
          {media.length > 1 && (
            <div className="pm-thumbs">
              {media.map((m, i) => (
                <button
                  key={i}
                  className={"pm-thumb" + (i === idx ? " on" : "")}
                  style={i === idx ? { borderColor: color } : null}
                  onClick={() => setIdx(i)}
                  aria-label={"media " + (i + 1)}
                >
                  <MediaFrame item={m} color={color} lang={lang} ui={ui} />
                </button>
              ))}
            </div>
          )}

          <div className="proj-modal-body">
            <div className="pm-line" style={{ color }}>
              <span className="pm-roundel" style={{ background: color }}>{ln.code}</span>
              {tr(ln.domain)}
            </div>
            <div className="pm-titlerow">
              <h3 className="cert-modal-name">{tr(st.name)}</h3>
              <span className="pm-year">{st.year}</span>
            </div>
            <div className="pcard-status" style={{ color }}>
              <span className="status-dot" style={{ background: st.status === "future" ? "transparent" : color, borderColor: color }} />
              {statusLabel(st.status, ui, lang)}
            </div>
            <p className="pm-desc">{tr(st.desc)}</p>

            <div className="pm-stack">
              <span className="pm-label">{tr(ui.techStack)}</span>
              <div className="pcard-tags">
                {st.stack.map((s) => <span className="tag" key={s}>{s}</span>)}
              </div>
            </div>

            {repoUrl ? (
              <a className="pm-repo-btn" href={repoUrl} target="_blank" rel="noreferrer">
                <GhIcon size={16} /> {tr(ui.openRepo)} <span className="pm-ext">↗</span>
              </a>
            ) : (
              <div className="pm-repo-soon">{tr(ui.repoSoon)}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- ledger ----------
  function DetailsView({ data, colors, lang, selected, onOpen }) {
    const tr = (o) => (o && typeof o === "object" ? o[lang] : o);
    const ui = data.ui;

    return (
      <div className="details">
        <header className="details-head">
          <h2 className="details-title">{tr(ui.ledgerTitle)}</h2>
          <p className="details-sub">{tr(ui.ledgerSub)}</p>
        </header>

        <div className="details-grid">
          {data.lines.map((ln) => {
            const color = colors[ln.id];
            return (
              <section className="track-col" key={ln.id}>
                <div className="track-head">
                  <span className="track-roundel" style={{ background: color }}>{ln.code}</span>
                  <div>
                    <div className="track-name">{tr(ln.name)}</div>
                    <div className="track-domain">{tr(ln.domain)}</div>
                  </div>
                </div>

                <div className="card-stack">
                  {ln.stations.map((st) => {
                    const on = selected === st.id;
                    const repoUrl = repoUrlFor(data, st.id);
                    return (
                      <article
                        id={`card-${st.id}`}
                        key={st.id}
                        className={"pcard" + (on ? " on" : "")}
                        style={on ? { ["--ring"]: color } : null}
                        onClick={() => onOpen(st.id)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(st.id); } }}
                      >
                        <div className="pcard-top">
                          <h3 className="pcard-name">{tr(st.name)}</h3>
                          <span className="pcard-year">{st.year}</span>
                        </div>
                        <div className="pcard-status" style={{ color }}>
                          <span className="status-dot" style={{ background: st.status === "future" ? "transparent" : color, borderColor: color }} />
                          {statusLabel(st.status, ui, lang)}
                        </div>
                        <p className="pcard-desc">{tr(st.desc)}</p>
                        <div className="pcard-foot">
                          <div className="pcard-tags">
                            {st.stack.map((s) => <span className="tag" key={s}>{s}</span>)}
                          </div>
                          {repoUrl && (
                            <a
                              className="pcard-repo"
                              href={repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={tr(ui.repoLink)}
                            >
                              <GhIcon /> <span className="pcard-repo-arrow">↗</span>
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  window.DetailsView = DetailsView;
  window.ProjectModal = ProjectModal;
})();
