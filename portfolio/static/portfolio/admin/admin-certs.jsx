// admin-certs.jsx — CRUD for certificates / achievements (grouped by type).
(function () {
  const { useState, useEffect } = React;
  const tr = (o, l) => (o && typeof o === "object" ? (o[l] || o.ru || "") : (o || ""));

  function emptyCert(groupId) {
    return {
      id: "x-" + Math.random().toString(36).slice(2, 8),
      groupId: groupId || "courses",
      year: String(new Date().getFullYear()),
      img: null,
      title:  { ru: "", en: "" },
      issuer: { ru: "", en: "" },
      cred:   { ru: "", en: "" },
      skills: [],
      _new: true,
    };
  }

  // ---------- Editor ----------
  function CertEditor({ cert, groupMeta, onClose, onSave }) {
    const [c, setC] = useState(cert);
    const [tried, setTried] = useState(false);
    const set = (patch) => setC((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const titleOk = (c.title.ru || "").trim() && (c.title.en || "").trim();
    const valid = titleOk && c.groupId && c.year;
    const grp = groupMeta.find((g) => g.id === c.groupId);

    const save = () => { setTried(true); if (valid) onSave(c); };

    return (
      <React.Fragment>
        <div className="drawer-scrim" onClick={onClose} />
        <aside className="drawer" role="dialog" aria-modal="true">
          <header className="drawer-head">
            <div>
              <div className="drawer-sub">{c._new ? "Новый сертификат" : "Редактирование"}</div>
              <div className="drawer-title">{tr(c.title, "ru") || "Без названия"}</div>
            </div>
            <button className="drawer-close" onClick={onClose} aria-label="Закрыть">✕</button>
          </header>

          <div className="drawer-body">
            <Field label="Группа" required>
              <div className="linepick">
                {groupMeta.map((g) => (
                  <button type="button" key={g.id}
                    className={"linepick-opt" + (c.groupId === g.id ? " on" : "")}
                    style={c.groupId === g.id ? { color: g.color } : null}
                    onClick={() => set({ groupId: g.id })}>
                    <span className="linepick-roundel" style={{ background: g.color }}>{g.code}</span>
                    {g.name}
                  </button>
                ))}
              </div>
            </Field>

            <ScanUploader label="Скан сертификата" value={c.img} seal={grp ? grp.code : "—"}
              onChange={(img) => set({ img })} />

            <Bilingual label="Название" required value={c.title}
              phRu="CS50x: Основы информатики" phEn="CS50x: Intro to Computer Science"
              error={tried && !titleOk ? "Заполните оба языка" : ""}
              onChange={(title) => set({ title })} />

            <Bilingual label="Издатель" value={c.issuer}
              phRu="Harvard University · edX" phEn="Harvard University · edX"
              onChange={(issuer) => set({ issuer })} />

            <div className="field-row">
              <Field label="Год" required error={tried && !c.year ? "Укажите год" : ""}>
                <TextInput value={c.year} placeholder="2024" onChange={(year) => set({ year })} />
              </Field>
            </div>

            <Bilingual label="Отметка / результат" value={c.cred}
              phRu="Сертификат с отличием" phEn="Certificate with honors"
              onChange={(cred) => set({ cred })} />

            <TagInput label="Навыки" value={c.skills} placeholder="SQL, PostgreSQL…"
              onChange={(skills) => set({ skills })} />
          </div>

          <footer className="drawer-foot">
            <button className="btn-ghost-2" onClick={onClose}>Отмена</button>
            <div className="spacer" />
            <button className="btn-save" onClick={save} disabled={tried && !valid}>
              {c._new ? "Создать сертификат" : "Сохранить"}
            </button>
          </footer>
        </aside>
      </React.Fragment>
    );
  }

  // ---------- Row ----------
  function CertRow({ c, color, onEdit, onDelete }) {
    return (
      <div className="arow" onClick={onEdit}>
        <span className="arow-accent" style={{ background: color }} />
        <div className="arow-main">
          <div className="arow-top">
            <span className="arow-name">{tr(c.title, "ru") || "Без названия"}</span>
            <span className="arow-year">{c.year}</span>
            {c.img
              ? <span className="meta-pill on-map"><AdminIcon.image />скан</span>
              : <span className="meta-pill">нет скана</span>}
          </div>
          {tr(c.issuer, "ru") ? <div className="arow-desc">{tr(c.issuer, "ru")}{tr(c.cred, "ru") ? " · " + tr(c.cred, "ru") : ""}</div> : null}
          {c.skills && c.skills.length ? (
            <div className="arow-tags">
              {c.skills.map((t) => <span className="tg" key={t} style={{ paddingRight: 9 }}>{t}</span>)}
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
  function CertsPanel({ certs, groupMeta, onSave, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [confirm, setConfirm] = useState(null);

    return (
      <React.Fragment>
        <div className="asection-head">
          <div className="asection-titles">
            <h2 className="asection-title">Сертификаты и достижения</h2>
            <p className="asection-sub">Курсы, олимпиады и грамоты. Загрузите скан — он появится на странице сертификатов.</p>
          </div>
          <div className="atop-spacer" />
          <button className="btn-add" onClick={() => setEditing(emptyCert("courses"))}>
            <span className="plus">+</span> Добавить сертификат
          </button>
        </div>

        {certs.length === 0 && (
          <div className="aempty">Пока нет сертификатов. Нажмите «Добавить сертификат».</div>
        )}

        {groupMeta.map((g) => {
          const items = certs
            .filter((c) => c.groupId === g.id)
            .sort((a, b) => (b.year || "").localeCompare(a.year || ""));
          if (!items.length) return null;
          return (
            <div className="agroup" key={g.id}>
              <div className="agroup-head">
                <span className="agroup-roundel" style={{ background: g.color }}>{g.code}</span>
                <span className="agroup-name">{g.name}</span>
                <span className="agroup-meta">{items.length} {items.length === 1 ? "шт." : "шт."}</span>
              </div>
              <div className="arows">
                {items.map((c) => (
                  <CertRow key={c.id} c={c} color={g.color}
                    onEdit={() => setEditing(c)}
                    onDelete={() => setConfirm(c)} />
                ))}
              </div>
            </div>
          );
        })}

        {editing && (
          <CertEditor
            cert={editing}
            groupMeta={groupMeta}
            onClose={() => setEditing(null)}
            onSave={(c) => { onSave(c); setEditing(null); }}
          />
        )}

        {confirm && (
          <ConfirmDialog
            title="Удалить сертификат?"
            text={`«${tr(confirm.title, "ru") || "Без названия"}» будет удалён со страницы сертификатов. Действие необратимо.`}
            onCancel={() => setConfirm(null)}
            onConfirm={() => { onDelete(confirm.id); setConfirm(null); }}
          />
        )}
      </React.Fragment>
    );
  }

  window.CertsPanel = CertsPanel;
})();
