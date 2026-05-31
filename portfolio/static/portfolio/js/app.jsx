// app.jsx — composes the metro portfolio: left content block, map, details, chrome.
(function () {
  const { useState, useEffect, useRef } = React;

  // Hue mapping is fixed (purple=algo, green=db, orange-red=sys); palettes vary tone.
  const PALETTES = {
    muted: { light: { algo: "#8d76b5", db: "#6aa384", sys: "#c47a59" }, dark: { algo: "#ab93d6", db: "#84c4a0", sys: "#dc9270" } },
    bolder: { light: { algo: "#7a5cc0", db: "#3f9d6f", sys: "#cf5f38" }, dark: { algo: "#9d80e0", db: "#5cc28d", sys: "#e8825a" } },
    chalk: { light: { algo: "#a392c5", db: "#8bb8a0", sys: "#d29a80" }, dark: { algo: "#bcaede", db: "#a6d2bb", sys: "#e3b59c" } }
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "curve": 1,
    "stationStyle": "ring",
    "palette": "muted",
    "layout": "standard",
    "animateOnLoad": true,
    "dark": false
  } /*EDITMODE-END*/;

  const tr = (o, lang) => o && typeof o === "object" && !Array.isArray(o) ? o[lang] : o;

  function TgIcon() {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M21.94 4.3 18.6 19.06c-.25 1.1-.92 1.37-1.86.85l-5.14-3.79-2.48 2.39c-.27.27-.5.5-1.03.5l.37-5.2 9.5-8.58c.41-.37-.09-.57-.64-.2L5.02 12.4l-5.06-1.58c-1.1-.34-1.12-1.1.23-1.63L20.5 2.6c.92-.34 1.72.2 1.44 1.7z" transform="translate(1 0)" />
      </svg>);

  }

  function Tooltip({ hover, lang }) {
    if (!hover) return null;
    const { station, line, x, y } = hover;
    return (
      <div className="tip" style={{ left: x + 16, top: y + 16 }}>
        <div className="tip-name">{tr(station.name, lang)}</div>
        <div className="tip-meta">{tr(line.name, lang)} · {station.year}</div>
        <div className="tip-stack">{station.stack.join(" · ")}</div>
      </div>);

  }

  function timeAgo(isoString, lang) {
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 3600)  return lang === "ru" ? `${Math.floor(diff/60)} мин назад`  : `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return lang === "ru" ? `${Math.floor(diff/3600)} ч назад`  : `${Math.floor(diff/3600)}h ago`;
    return lang === "ru" ? `${Math.floor(diff/86400)} дн назад` : `${Math.floor(diff/86400)}d ago`;
  }

  function GitActivity({ colors, lang }) {
    const accent = colors.algo;
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
      fetch("/api/github/")
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => setError(true));
    }, []);

    // пока грузится — заглушка
    if (!data && !error) {
      return (
        <div className="gh-status" style={{ "--gh-accent": accent }}>
          <div className="gh-status-line">
            <span className="gh-live" />
            <span style={{ opacity: 0.4 }}>{lang === "ru" ? "загрузка..." : "loading..."}</span>
          </div>
        </div>
      );
    }

    // если API недоступен
    if (error || data.error) {
      return (
        <div className="gh-status" style={{ "--gh-accent": accent }}>
          <div className="gh-status-line">
            <span className="gh-live" />
            <a className="gh-repo" href="https://github.com/deka4core" target="_blank" rel="noreferrer">
              github.com/deka4core
            </a>
          </div>
        </div>
      );
    }

    const push = lang === "ru" ? "push в" : "pushed to";
    const ago = data.latest_ago ? timeAgo(data.latest_ago, lang) : "";
    const reposLabel = lang === "ru" ? "репозитория" : "repos";
    const stars = lang === "ru" ? "звезд" : "stars";

    return (
      <div className="gh-status" style={{ "--gh-accent": accent }}>
        <div className="gh-status-line">
          <span className="gh-live" />
          {push} <span className="gh-repo">{data.latest_repo}</span>
          <span className="gh-dot-sep">·</span> {ago}
        </div>
        <div className="gh-status-stats">

          <span><b>{data.repos}</b> {reposLabel} · <b>{data.stars}</b> {stars} · github.com/deka4core</span>
        </div>
      </div>
    );
  }

  function Intro({ data, colors, lang }) {
    const p = data.person;
    const name = lang === "ru" ? p.nameRu : p.nameEn;
    const eyebrow = (lang === "ru" ? p.nameEn : p.nameRu).toUpperCase();
    return (
      <div className="intro">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="name">{name}</h1>
        <div className="subtitle">{tr(p.subtitle, lang)}</div>
        <p className="bio">{tr(p.bio, lang)}</p>
        <div className="chips">
          {p.chips.map((c) => <span className="chip" key={c}>{c}</span>)}
        </div>
        <div className="actions">
          <a className="btn btn-primary" href={p.githubUrl} target="_blank" rel="noreferrer">
            <span className="btn-arrow">↗</span> GitHub
          </a>
          <a className="btn btn-ghost" href={p.telegramUrl} target="_blank" rel="noreferrer">
            <TgIcon /> Telegram
          </a>
          <a className="btn btn-ghost" href={p.resumeUrl} target={p.resumeUrl === "#" ? "_self" : "_blank"} rel="noreferrer">
            {tr(data.ui.resume, lang)}
          </a>
        </div>
        <GitActivity colors={colors} lang={lang} />
      </div>);

  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const data = window.PORTFOLIO_DATA;
    const [tab, setTab] = useState("map");
    const [selected, setSelected] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [hover, setHover] = useState(null);
    const [mapNonce, setMapNonce] = useState(0);
    const [lang, setLang] = useState(() => {
      try {return localStorage.getItem("portfolio_lang") || "en";} catch (e) {return "en";}
    });
    const prevTab = useRef("map");
    const detailsRef = useRef(null);

    useEffect(() => {
      try {localStorage.setItem("portfolio_lang", lang);} catch (e) {}
      document.documentElement.lang = lang;
    }, [lang]);

    const dark = t.dark;
    const colors = PALETTES[t.palette][dark ? "dark" : "light"];

    // opening a project (from the map or the ledger) -> highlight + modal
    function openProject(id) {
      setSelected(id);
      setOpenId(id);
    }

    const projById = {};
    data.lines.forEach((ln) => ln.stations.forEach((st) => {projById[st.id] = { st, ln };}));

    useEffect(() => {
      // replay map draw only when returning from details, never on first mount
      if (tab === "map" && prevTab.current === "details") setMapNonce((n) => n + 1);
      prevTab.current = tab;
    }, [tab]);

    return (
      <div className={"stage" + (dark ? " dark" : "") + " layout-" + t.layout}>
        {/* chrome */}
        <div className="chrome">
          <div className="tabs lang-tabs">
            <button className={"tab" + (lang === "en" ? " on" : "")} onClick={() => setLang("en")}>EN</button>
            <button className={"tab" + (lang === "ru" ? " on" : "")} onClick={() => setLang("ru")}>RU</button>
          </div>
          <div className="tabs">
            <button className={"tab" + (tab === "map" ? " on" : "")} onClick={() => setTab("map")}>{tr(data.ui.tabMap, lang)}</button>
            <button className={"tab" + (tab === "details" ? " on" : "")} onClick={() => setTab("details")}>{tr(data.ui.tabDetails, lang)}</button>
            <button className={"tab" + (tab === "certs" ? " on" : "")} onClick={() => setTab("certs")}>{tr(data.ui.tabCerts, lang)}</button>
          </div>
          <button className="theme-toggle" onClick={() => setTweak("dark", !dark)} aria-label="Toggle theme">
            {dark ? "☀" : "☾"}
          </button>
        </div>

        {tab === "map" ?
        <div className="home">
            <Intro data={data} colors={colors} lang={lang} />
            <div className="map-wrap">
              <window.MetroMap
              key={t.animateOnLoad + "-" + mapNonce}
              data={data}
              colors={colors}
              curve={t.curve}
              stationStyle={t.stationStyle}
              animate={t.animateOnLoad}
              lang={lang}
              selected={selected}
              onHover={setHover}
              onSelect={openProject} />
            
            </div>
          </div> :
        tab === "details" ?
        <div className="details-scroll" ref={detailsRef}>
            <window.DetailsView data={data} colors={colors} lang={lang} selected={selected} onOpen={openProject} />
          </div> :

        <div className="certs-scroll">
            <window.CertificatesView data={data} colors={colors} lang={lang} />
          </div>
        }

        <Tooltip hover={tab === "map" ? hover : null} lang={lang} />

        {openId && projById[openId] &&
        <window.ProjectModal
          entry={projById[openId]}
          data={data}
          colors={colors}
          lang={lang}
          onClose={() => setOpenId(null)} />

        }

        <TweaksPanel>
          <TweakSection label="Map" />
          <TweakSlider label="Curve intensity" value={t.curve} min={0} max={2} step={0.1} onChange={(v) => setTweak("curve", v)} />
          <TweakRadio label="Station style" value={t.stationStyle} options={["ring", "filled", "tick"]} onChange={(v) => setTweak("stationStyle", v)} />
          <TweakToggle label="Draw animation" value={t.animateOnLoad} onChange={(v) => setTweak("animateOnLoad", v)} />
          <TweakSection label="Look" />
          <TweakRadio label="Palette" value={t.palette} options={["muted", "bolder", "chalk"]} onChange={(v) => setTweak("palette", v)} />
          <TweakRadio label="Left block" value={t.layout} options={["standard", "compact"]} onChange={(v) => setTweak("layout", v)} />
          <TweakToggle label="Dark mode" value={dark} onChange={(v) => setTweak("dark", v)} />
        </TweaksPanel>
      </div>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();