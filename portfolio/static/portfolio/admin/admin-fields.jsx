// admin-fields.jsx — reusable form controls in the Swiss-transit language.
// Exports field components + a few helpers to window for the other admin scripts.
(function () {
  const { useState, useRef } = React;

  // ---- icons ----
  const Icon = {
    edit: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
    trash: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" /><path d="M10 11v6M14 11v6" /></svg>,
    map: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="10" r="3" /><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /></svg>,
    git: (p) => <svg viewBox="0 0 16 16" fill="currentColor" {...p}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>,
    image: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
  };

  // ---- field wrapper ----
  function Field({ label, required, hint, error, children }) {
    return (
      <div className="field">
        {label && <label className="field-label">{label}{required && <span className="req">*</span>}</label>}
        {children}
        {hint && !error && <div className="field-hint">{hint}</div>}
        {error && <div className="err-text">{error}</div>}
      </div>
    );
  }

  function TextInput({ value, onChange, placeholder, type = "text" }) {
    return <input className="inp" type={type} value={value || ""} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} />;
  }

  // ---- bilingual text field (ru / en) ----
  function Bilingual({ label, required, value, onChange, multiline, phRu, phEn, error }) {
    const v = value || { ru: "", en: "" };
    const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });
    const Tag = multiline ? "textarea" : "input";
    const cls = multiline ? "ta" : "inp";
    return (
      <Field label={label} required={required} error={error}>
        <div className="bi">
          <div className="bi-line">
            <span className="bi-tag">RU</span>
            <Tag className={cls} value={v.ru} placeholder={phRu} onChange={set("ru")} />
          </div>
          <div className="bi-line">
            <span className="bi-tag">EN</span>
            <Tag className={cls} value={v.en} placeholder={phEn} onChange={set("en")} />
          </div>
        </div>
      </Field>
    );
  }

  // ---- tag input (stack / skills) ----
  function TagInput({ label, value, onChange, placeholder }) {
    const [draft, setDraft] = useState("");
    const tags = value || [];
    const add = (raw) => {
      const t = (raw || "").trim();
      if (!t) return;
      if (!tags.includes(t)) onChange([...tags, t]);
      setDraft("");
    };
    const remove = (t) => onChange(tags.filter((x) => x !== t));
    return (
      <Field label={label}>
        <div className="tagbox">
          {tags.map((t) => (
            <span className="tg" key={t}>{t}<span className="tg-x" onClick={() => remove(t)}>×</span></span>
          ))}
          <input
            className="tagbox-inp"
            value={draft}
            placeholder={tags.length ? "" : placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
              else if (e.key === "Backspace" && !draft && tags.length) remove(tags[tags.length - 1]);
            }}
            onBlur={() => add(draft)}
          />
        </div>
      </Field>
    );
  }

  // ---- segmented control (status) ----
  function Segmented({ label, value, options, onChange }) {
    return (
      <Field label={label}>
        <div className="seg">
          {options.map((o) => (
            <button type="button" key={o.value}
              className={"seg-opt" + (value === o.value ? " on" : "")}
              onClick={() => onChange(o.value)}>
              {o.dot && <span className="sdot" style={o.dotStyle} />}
              {o.label}
            </button>
          ))}
        </div>
      </Field>
    );
  }

  // ---- toggle ----
  function Toggle({ label, hint, value, onChange }) {
    return (
      <div className="toggle-field">
        <div className={"switch" + (value ? " on" : "")} onClick={() => onChange(!value)}
          role="switch" aria-checked={value} />
        <div className="tf-text">
          <span className="tf-label">{label}</span>
          {hint && <span className="tf-hint">{hint}</span>}
        </div>
      </div>
    );
  }

  // ---- line picker (project line) ----
  function LinePicker({ label, value, options, onChange }) {
    return (
      <Field label={label} required>
        <div className="linepick">
          {options.map((o) => (
            <button type="button" key={o.id}
              className={"linepick-opt" + (value === o.id ? " on" : "")}
              style={value === o.id ? { color: o.color } : null}
              onClick={() => onChange(o.id)}>
              <span className="linepick-roundel" style={{ background: o.color }}>{o.code}</span>
              {o.name}
            </button>
          ))}
        </div>
      </Field>
    );
  }

  // ---- read a File as data URL ----
  function readAsDataURL(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  // ---- multi media uploader (gallery) ----
  function MediaUploader({ label, value, onChange }) {
    const media = value || [];
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    const ingest = async (files) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const added = [];
      for (const f of arr) {
        const src = await readAsDataURL(f);
        added.push({ type: f.type === "image/gif" ? "gif" : "image", src, caption: { ru: "", en: "" }, name: f.name });
      }
      if (added.length) onChange([...media, ...added]);
    };

    const removeAt = (i) => onChange(media.filter((_, j) => j !== i));
    const move = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= media.length) return;
      const next = media.slice();
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };

    return (
      <Field label={label} hint="Первый файл — главное превью. GIF и изображения. Перетащите или выберите.">
        <div
          className={"media-drop" + (drag ? " drag" : "")}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); ingest(e.dataTransfer.files); }}
        >
          <span className="media-drop-ico"><Icon.image style={{ width: 22, height: 22 }} /></span>
          <span className="media-drop-text"><b>Загрузить медиа</b> — нажмите или перетащите</span>
          <span className="media-drop-sub">PNG · JPG · GIF</span>
          <input ref={inputRef} type="file" accept="image/*,.gif" multiple hidden
            onChange={(e) => { ingest(e.target.files); e.target.value = ""; }} />
        </div>
        {media.length > 0 && (
          <div className="media-grid">
            {media.map((m, i) => (
              <div className="media-thumb" key={i}>
                {m.src ? <img src={m.src} alt={m.name || ""} /> : null}
                <span className={"media-thumb-badge" + (i === 0 ? " main" : "")}>
                  {i === 0 ? "ГЛАВНОЕ" : (m.type === "gif" ? "GIF" : "IMG")}
                </span>
                <button type="button" className="media-thumb-x" onClick={() => removeAt(i)} aria-label="Удалить">×</button>
                <div className="media-thumb-nav">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Левее">‹</button>
                  <button type="button" disabled={i === media.length - 1} onClick={() => move(i, 1)} aria-label="Правее">›</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Field>
    );
  }

  // ---- single scan uploader (certificate) ----
  function ScanUploader({ label, value, onChange, seal }) {
    const inputRef = useRef(null);
    const pick = async (files) => {
      const f = files && files[0];
      if (!f || !f.type.startsWith("image/")) return;
      const src = await readAsDataURL(f);
      onChange(src);
    };
    return (
      <Field label={label} hint="Скан сертификата — JPG или PNG.">
        <div className="scan-up">
          <div className="scan-preview">
            {value ? <img src={value} alt="скан" /> : <span className="scan-seal">{seal || "—"}</span>}
          </div>
          <div className="scan-side">
            <div className="media-drop" onClick={() => inputRef.current && inputRef.current.click()}>
              <span className="media-drop-text"><b>{value ? "Заменить" : "Загрузить"} скан</b></span>
              <span className="media-drop-sub">нажмите, чтобы выбрать файл</span>
            </div>
            {value && <button type="button" className="scan-remove" onClick={() => onChange(null)}>Убрать скан</button>}
            <input ref={inputRef} type="file" accept="image/*" hidden
              onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </div>
        </div>
      </Field>
    );
  }

  // ---- confirm dialog (shared) ----
  function ConfirmDialog({ title, text, confirmLabel, onCancel, onConfirm }) {
    React.useEffect(() => {
      const onKey = (e) => { if (e.key === "Escape") onCancel(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);
    return (
      <div className="confirm-scrim" onClick={onCancel}>
        <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-text">{text}</p>
          <div className="confirm-row">
            <button className="btn-ghost-2" onClick={onCancel}>Отмена</button>
            <button className="btn-danger" onClick={onConfirm}>
              <Icon.trash />{confirmLabel || "Удалить"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, {
    AdminIcon: Icon,
    Field, TextInput, Bilingual, TagInput, Segmented, Toggle, LinePicker, MediaUploader, ScanUploader, ConfirmDialog,
  });
})();
