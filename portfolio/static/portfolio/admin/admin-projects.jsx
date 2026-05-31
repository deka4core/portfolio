// admin-projects.jsx — CRUD for the project ledger (metro stations).
(function () {
  const { useState, useEffect } = React;
  const tr = (o, l) => (o && typeof o === "object" ? (o[l] || o.ru || "") : (o || ""));

  const STATUS = [
    { value: "done",    label: "Готово",  dotStyle: { background: "var(--ok)" } },
    { value: "current", label: "В работе", dotStyle: { background: "var(--line-algo)" } },
    { value: "future",  label: "В планах", dotStyle: { background: "transparent", border: "1.5px solid var(--ink-faint)" } },
  ];
  const statusClass = (s) => (s === "done" ? "s-done" : s === "current" ? "s-current" : "s-future");
  const statusLabel = (s) => (s === "done" ? "Готово" : s === "current" ? "В работе" : "В планах");

  function emptyProject(lineId) {
    return {
      id: "p-" + Math.random().toString(36).slice(2, 8),
      lineId: lineId || "algo",
      year: String(new Date().getFullYear()),
      status: "current",
      onMap: true,
      name: { ru: "", en: "" },
      desc: { ru: "", en: "" },
      stack: [],
      repo: "",
      media: [],
      _new: true,
    };
  }

  // ---------- Editor drawer ----------
  function ProjectEditor({ project, lineMeta, onClose, onSave }) {
    const [p, setP] = useState(project);
    const [tried, setTried] = useState(false);
    const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const nameOk = (p.name.ru || "").trim() && (p.name.en || "").trim();
    const valid = nameOk && p.lineId && p.year;

    const save = () => {
      setTried(true);
      if (!valid) return;
      onSave(p);
    };

    return (
      <React.Fragment>
        <div className="drawer-scrim" onClick={onClose} />
        <aside className="drawer" role="dialog" aria-modal="true">
          <header className="drawer-head">
            <div>
              <div className="drawer-sub">{p._new ? "Новый проект" : "Редактирование"}</div>
              <div className="drawer-title">{tr(p.name, "ru") || "Без названия"}</div>
            </div>
            <button className="drawer-close" onClick={onClose} aria-label="Закрыть">✕</button>
          </header>

          <div className="drawer-body">
            <LinePicker label="Линия" value={p.lineId}
              options={lineMeta} onChange={(lineId) => set({ lineId })} />

            <div className="field-row">
              <Segmented label="Статус" value={p.status} options={STATUS} onChange={(status) => set({ status })} />
              <Field label="Год" required error={tried && !p.year ? "Укажите год" : ""}>
                <TextInput value={p.year} placeholder="2025" onChange={(year) => set({ year })} />
              </Field>
            </div>

            <Bilingual label="Название" required value={p.name}
              phRu="Визуализатор путей" phEn="Pathfinding Visualizer"
              error={tried && !nameOk ? "Заполните оба языка" : ""}
              onChange={(name) => set({ name })} />

            <Bilingual label="Описание" multiline value={p.desc}
              phRu="Что это за проект, чему научил…" phEn="What it is, what it taught you…"
              onChange={(desc) => set({ desc })} />

            <TagInput label="Стек" value={p.stack} placeholder="Python, C++, Redis…"
              onChange={(stack) => set({ stack })} />

            <Field label="GitHub-репозиторий" hint="Полная ссылка или slug. Оставьте пустым — покажется «появится позже».">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)", display: "grid", placeItems: "center" }}>
                  <AdminIcon.git style={{ width: 14, height: 14 }} />
                </span>
                <input className="inp" style={{ paddingLeft: 34 }} value={p.repo || ""}
                  placeholder="github.com/deka4core/pathfinding-visualizer"
                  onChange={(e) => set({ repo: e.target.value })} />
              </div>
            </Field>

            <MediaUploader label="Медиа" value={p.media} onChange={(media) => set({ media })} />

            <div style={{ height: 1, background: "var(--line-hair)" }} />

            <Toggle label="Показывать на карте метро"
              hint="Выключите, чтобы проект был только в журнале, но не как станция на схеме."
              value={p.onMap} onChange={(onMap) => set({ onMap })} />
          </div>

          <footer className="drawer-foot">
            <button className="btn-ghost-2" onClick={onClose}>Отмена</button>
            <div className="spacer" />
            <button className="btn-save" onClick={save} disabled={tried && !valid}>
              {p._new ? "Создать проект" : "Сохранить"}
            </button>
          </footer>
        </aside>
      </React.Fragment>
    );
  }

  // ---------- Row ----------
  function ProjectRow({ p, color, onEdit, onDelete }) {
    return (
      <div className="arow" onClick={onEdit}>
        <span className="arow-accent" style={{ background: color }} />
        <div className="arow-main">
          <div className="arow-top">
            <span className="arow-name">{tr(p.name, "ru") || "Без названия"}</span>
            <span className="arow-year">{p.year}</span>
            <span className={"status-pill " + statusClass(p.status)}>
              <span className="sdot" />{statusLabel(p.status)}
            </span>
            {p.onMap
              ? <span className="meta-pill on-map"><AdminIcon.map />на карте</span>
              : <span className="meta-pill">только в журнале</span>}
            {p.repo ? <span className="meta-pill"><AdminIcon.git style={{ width: 12, height: 12 }} />репо</span> : null}
            {p.media && p.media.length
              ? <span className="meta-pill"><AdminIcon.image />{p.media.length}</span> : null}
          </div>
          {tr(p.desc, "ru") ? <div className="arow-desc">{tr(p.desc, "ru")}</div> : null}
          {p.stack && p.stack.length ? (
            <div className="arow-tags">
              {p.stack.map((t) => <span className="tg" key={t} style={{ paddingRight: 9 }}>{t}</span>)}
            </div>
          ) : null}
        </div>
        <div className="arow-actions" onClick={(e) => e.stopPropagation()}>
          <button className="row-act" onClick={onEdit} aria-label="Редактировать"><AdminIcon.edit /></button>
          <button className="row-act del" onClick={onDelete} aria-label="Удалить"><AdminIcon.trash /></button>
        </div>
      </div>
    );
  }

  // ---------- Panel ----------
  function ProjectsPanel({ projects, lineMeta, colorOf, onSave, onDelete }) {
    const [editing, setEditing] = useState(null); // project object or null
    const [confirm, setConfirm] = useState(null);  // project to delete
    const [filter, setFilter] = useState("all");

    const lines = lineMeta.filter((l) => filter === "all" || l.id === filter);

    return (
      <React.Fragment>
        <div className="asection-head">
          <div className="asection-titles">
            <h2 className="asection-title">Журнал проектов</h2>
            <p className="asection-sub">Станции на карте и записи журнала. Отметьте, какие показывать на схеме метро.</p>
          </div>
          <div className="atop-spacer" />
          <button className="btn-add" onClick={() => setEditing(emptyProject(filter === "all" ? "algo" : filter))}>
            <span className="plus">+</span> Добавить проект
          </button>
        </div>

        <div className="afilter">
          <button className={"afilter-chip" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>
            Все линии <span className="arow-year">{projects.length}</span>
          </button>
          {lineMeta.map((l) => {
            const n = projects.filter((p) => p.lineId === l.id).length;
            return (
              <button key={l.id} className={"afilter-chip" + (filter === l.id ? " on" : "")} onClick={() => setFilter(l.id)}>
                <span className="afilter-roundel" style={{ background: l.color }}>{l.code}</span>
                {l.name} <span className="arow-year">{n}</span>
              </button>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="aempty">Пока нет проектов. Нажмите «Добавить проект», чтобы создать первый.</div>
        )}

        {lines.map((l) => {
          const items = projects
            .filter((p) => p.lineId === l.id)
            .sort((a, b) => (b.year || "").localeCompare(a.year || ""));
          if (!items.length) return null;
          return (
            <div className="agroup" key={l.id}>
              <div className="agroup-head">
                <span className="agroup-roundel" style={{ background: l.color }}>{l.code}</span>
                <span className="agroup-name">{l.name}</span>
                <span className="agroup-meta">{items.length} {items.length === 1 ? "проект" : "проектов"}</span>
              </div>
              <div className="arows">
                {items.map((p) => (
                  <ProjectRow key={p.id} p={p} color={l.color}
                    onEdit={() => setEditing(p)}
                    onDelete={() => setConfirm(p)} />
                ))}
              </div>
            </div>
          );
        })}

        {editing && (
          <ProjectEditor
            project={editing}
            lineMeta={lineMeta}
            onClose={() => setEditing(null)}
            onSave={(p) => { onSave(p); setEditing(null); }}
          />
        )}

        {confirm && (
          <ConfirmDialog
            title="Удалить проект?"
            text={`«${tr(confirm.name, "ru") || "Без названия"}» будет удалён из журнала${confirm.onMap ? " и с карты метро" : ""}. Действие необратимо.`}
            onCancel={() => setConfirm(null)}
            onConfirm={() => { onDelete(confirm.id); setConfirm(null); }}
          />
        )}
      </React.Fragment>
    );
  }

  window.ProjectsPanel = ProjectsPanel;
})();
