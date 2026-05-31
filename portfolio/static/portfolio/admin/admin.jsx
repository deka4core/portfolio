// admin.jsx — back-office shell with real Django REST API.
(function () {
  const { useState, useEffect, useCallback } = React;
  const D = window.PORTFOLIO_DATA;

  const LINE_COLOR = { algo: "#8d76b5", db: "#6aa384", sys: "#c47a59" };

  const lineMeta = D.lines.map((l) => ({
    id: l.id, code: l.code, name: l.name.ru, color: LINE_COLOR[l.id]
  }));
  const groupMeta = D.certificates.groups.map((g) => ({
    id: g.id, code: g.code, name: g.name.ru, color: LINE_COLOR[g.colorKey] || "#8d76b5"
  }));

  // ================= API =================
  const api = {
    async getProjects() {
      const r = await fetch("/api/projects/");
      const data = await r.json();
      return data.projects;
    },
    async saveProject(project) {
      const isNew = !!project._new;
      const clean = { ...project }; delete clean._new;
      const url = isNew ? "/api/projects/" : `/api/projects/${clean.id}/`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      });
      if (!r.ok) throw new Error("Ошибка сохранения");
      return await r.json();
    },
    async deleteProject(id) {
      const r = await fetch(`/api/projects/${id}/`, { method: "DELETE" });
      if (!r.ok) throw new Error("Ошибка удаления");
      return true;
    },
    async getCerts() {
      const r = await fetch("/api/certs/");
      const data = await r.json();
      return data.certs;
    },
    async saveCert(cert) {
      const isNew = !!cert._new;
      const clean = { ...cert }; delete clean._new;
      const url = isNew ? "/api/certs/" : `/api/certs/${clean.id}/`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      });
      if (!r.ok) throw new Error("Ошибка сохранения");
      return await r.json();
    },
    async deleteCert(id) {
      const r = await fetch(`/api/certs/${id}/`, { method: "DELETE" });
      if (!r.ok) throw new Error("Ошибка удаления");
      return true;
    },
  };

  // ================= LOGIN =================
  function Login({ onAuth }) {
    const [u, setU] = useState("");
    const [p, setP] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
      e.preventDefault();
      setErr(""); setBusy(true);
      if (!u.trim() || !p.trim()) {
        setErr("Введите логин и пароль"); setBusy(false); return;
      }
      onAuth(u.trim());
    };

    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-mark">
            <div className="login-roundel">TZ</div>
            <div className="login-mark-text">
              <span className="login-mark-title">Timofey Zalevsky</span>
              <span className="login-mark-sub">Admin · Панель</span>
            </div>
          </div>
          <h1 className="login-head">Вход в админку</h1>
          <p className="login-lead">Управление журналом проектов и сертификатами портфолио.</p>
          <form className="login-form" onSubmit={submit}>
            {err && <div className="login-err">{err}</div>}
            <div className="field">
              <label className="field-label">Логин</label>
              <input className="inp" value={u} autoFocus autoComplete="username"
                onChange={(e) => setU(e.target.value)} placeholder="admin" />
            </div>
            <div className="field">
              <label className="field-label">Пароль</label>
              <input className="inp" type="password" value={p} autoComplete="current-password"
                onChange={(e) => setP(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn-save" style={{ marginTop: 4 }} type="submit" disabled={busy}>
              {busy ? "Проверяем…" : "Войти"}
            </button>
          </form>
          <div className="login-hint">
            Демо-прототип · вход — <b>любой логин и пароль</b>.
          </div>
          <a className="login-back" href="/">‹ Вернуться к портфолио</a>
        </div>
      </div>
    );
  }

  // ================= SHELL =================
  function Admin() {
    const [user, setUser] = useState(() => {
      try { return sessionStorage.getItem("admin_user") || null; } catch (e) { return null; }
    });
    const [dark, setDark] = useState(() => {
      try {
        const s = localStorage.getItem("admin_dark");
        if (s != null) return s === "1";
      } catch (e) {}
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    const [tab, setTab] = useState("projects");
    const [projects, setProjects] = useState([]);
    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState("");

    useEffect(() => {
      try { localStorage.setItem("admin_dark", dark ? "1" : "0"); } catch (e) {}
    }, [dark]);

    // load data from API on login
    useEffect(() => {
      if (!user) return;
      setLoading(true);
      Promise.all([api.getProjects(), api.getCerts()])
        .then(([projs, certs]) => { setProjects(projs); setCerts(certs); })
        .catch(() => flash("Не удалось загрузить данные"))
        .finally(() => setLoading(false));
    }, [user]);

    const flash = useCallback((msg) => {
      setToast(msg);
      window.clearTimeout(flash._t);
      flash._t = window.setTimeout(() => setToast(""), 2400);
    }, []);

    const authIn = (u) => {
      try { sessionStorage.setItem("admin_user", u); } catch (e) {}
      setUser(u);
    };
    const logout = () => {
      try { sessionStorage.removeItem("admin_user"); } catch (e) {}
      setUser(null);
    };

    // ---- project handlers ----
    const saveProject = async (p) => {
      try {
        const saved = await api.saveProject(p);
        setProjects((list) => {
          const i = list.findIndex((x) => x.id === saved.id);
          if (i === -1) return [...list, saved];
          const next = list.slice(); next[i] = saved; return next;
        });
        flash(p._new ? "Проект создан" : "Проект сохранён");
      } catch (e) { flash("Ошибка: " + e.message); }
    };
    const deleteProject = async (id) => {
      try {
        await api.deleteProject(id);
        setProjects((list) => list.filter((x) => x.id !== id));
        flash("Проект удалён");
      } catch (e) { flash("Ошибка удаления"); }
    };

    // ---- cert handlers ----
    const saveCert = async (c) => {
      try {
        const saved = await api.saveCert(c);
        setCerts((list) => {
          const i = list.findIndex((x) => x.id === saved.id);
          if (i === -1) return [...list, saved];
          const next = list.slice(); next[i] = saved; return next;
        });
        flash(c._new ? "Сертификат создан" : "Сертификат сохранён");
      } catch (e) { flash("Ошибка: " + e.message); }
    };
    const deleteCert = async (id) => {
      try {
        await api.deleteCert(id);
        setCerts((list) => list.filter((x) => x.id !== id));
        flash("Сертификат удалён");
      } catch (e) { flash("Ошибка удаления"); }
    };

    if (!user) return (
      <div className={"aroot" + (dark ? " dark" : "")}>
        <Login onAuth={authIn} />
      </div>
    );

    return (
      <div className={"aroot" + (dark ? " dark" : "")}>
        <div className="ashell">
          <header className="atop">
            <div className="atop-brand">
              <div className="atop-roundel">TZ</div>
              <div className="atop-titles">
                <span className="atop-title">Админка портфолио</span>
                <span className="atop-sub">{loading ? "загрузка…" : ""}</span>
              </div>
            </div>
            <nav className="anav">
              <button className={"anav-tab" + (tab === "projects" ? " on" : "")} onClick={() => setTab("projects")}>
                Проекты <span className="anav-count">{projects.length}</span>
              </button>
              <button className={"anav-tab" + (tab === "certs" ? " on" : "")} onClick={() => setTab("certs")}>
                Сертификаты <span className="anav-count">{certs.length}</span>
              </button>
            </nav>
            <div className="atop-spacer" />
            <button className="icon-btn" onClick={() => setDark((d) => !d)} aria-label="Тема">{dark ? "☀" : "☾"}</button>
            <a className="icon-btn" href="/" aria-label="К сайту" title="Открыть портфолио" style={{ textDecoration: "none" }}>↗</a>
            <button className="text-btn" onClick={logout}>Выйти</button>
          </header>

          <main className="amain">
            {tab === "projects"
              ? <ProjectsPanel projects={projects} lineMeta={lineMeta} onSave={saveProject} onDelete={deleteProject} />
              : <CertsPanel certs={certs} groupMeta={groupMeta} onSave={saveCert} onDelete={deleteCert} />
            }
          </main>
        </div>

        <div className={"toast" + (toast ? " show" : "")}>
          <span className="tcheck">✓</span>{toast}
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<Admin />);
})();
