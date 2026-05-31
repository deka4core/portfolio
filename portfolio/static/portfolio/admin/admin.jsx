// admin.jsx — back-office shell: login, tabs, state derived from PORTFOLIO_DATA,
// and a single API stub layer to swap for the Django backend later.
(function () {
  const { useState, useEffect, useCallback } = React;
  const D = window.PORTFOLIO_DATA;

  // Fixed line/group palette (matches the "muted/light" palette in app.jsx).
  const LINE_COLOR = { algo: "#8d76b5", db: "#6aa384", sys: "#c47a59" };

  const lineMeta = D.lines.map((l) => ({
    id: l.id, code: l.code, name: l.name.ru, color: LINE_COLOR[l.id]
  }));
  const groupMeta = D.certificates.groups.map((g) => ({
    id: g.id, code: g.code, name: g.name.ru, color: LINE_COLOR[g.colorKey] || "#8d76b5"
  }));

  // ---- derive flat working sets from the content model ----
  function deriveProjects() {
    const out = [];
    D.lines.forEach((l) => l.stations.forEach((st) => {
      const slug = D.repos[st.id];
      out.push({
        id: st.id,
        lineId: l.id,
        year: st.year,
        status: st.status,
        onMap: true, // everything currently on the map
        name: { ...st.name },
        desc: { ...st.desc },
        stack: (st.stack || []).slice(),
        repo: slug ? D.repoBase.replace(/^https?:\/\//, "") + slug : "",
        media: (st.media || []).map((m) => ({ ...m }))
      });
    }));
    return out;
  }
  function deriveCerts() {
    const out = [];
    D.certificates.groups.forEach((g) => g.items.forEach((it) => {
      out.push({
        id: it.id, groupId: g.id, year: it.year, img: it.img,
        title: { ...it.title }, issuer: { ...it.issuer }, cred: { ...it.cred },
        skills: (it.skills || []).slice()
      });
    }));
    return out;
  }

  // ================= API STUB =================
  // Replace each body with a fetch() to your Django REST endpoints.
  // The shapes here map 1:1 to the Project / Certificate models you'll build.
  // Auth: send the session cookie + CSRF token (e.g. headers: {'X-CSRFToken': ...}).
  const api = {
    async login(username, password) {
      // TODO: POST /admin/api/login  -> sets session cookie
      await wait(450);
      if (!username.trim() || !password.trim()) throw new Error("Введите логин и пароль");
      return { user: username.trim() };
    },
    async saveProject(project) {
      // TODO: project.id existing -> PUT /admin/api/projects/<id>/
      //       new                -> POST /admin/api/projects/
      // Media files: upload as multipart/form-data; the data URLs here become File uploads.
      await wait(360);
      console.log("[api.saveProject]", project);
      return project;
    },
    async deleteProject(id) {
      // TODO: DELETE /admin/api/projects/<id>/
      await wait(280);
      console.log("[api.deleteProject]", id);
      return true;
    },
    async saveCert(cert) {
      // TODO: PUT/POST /admin/api/certificates/  (scan uploaded as multipart)
      await wait(360);
      console.log("[api.saveCert]", cert);
      return cert;
    },
    async deleteCert(id) {
      // TODO: DELETE /admin/api/certificates/<id>/
      await wait(280);
      console.log("[api.deleteCert]", id);
      return true;
    }
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ================= LOGIN =================
  function Login({ onAuth }) {
    const [u, setU] = useState("");
    const [p, setP] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
      e.preventDefault();
      setErr("");setBusy(true);
      try {
        const { user } = await api.login(u, p);
        onAuth(user);
      } catch (ex) {
        setErr(ex.message || "Не удалось войти");
        setBusy(false);
      }
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
            Демо-прототип · вход — <b>любой логин и пароль</b>.<br />
            На бэкенде это станет страницей Django <b>/admin</b> с реальной аутентификацией.
          </div>
          <a className="login-back" href="/">‹ Вернуться к портфолио</a>
        </div>
      </div>);

  }

  // ================= SHELL =================
  function Admin() {
    const [user, setUser] = useState(() => {
      try {return sessionStorage.getItem("admin_user") || null;} catch (e) {return null;}
    });
    const [dark, setDark] = useState(() => {
      try {
        const s = localStorage.getItem("admin_dark");
        if (s != null) return s === "1";
      } catch (e) {}
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    const [tab, setTab] = useState("projects");
    const [projects, setProjects] = useState(deriveProjects);
    const [certs, setCerts] = useState(deriveCerts);
    const [toast, setToast] = useState("");

    useEffect(() => {
      try {localStorage.setItem("admin_dark", dark ? "1" : "0");} catch (e) {}
    }, [dark]);

    const flash = useCallback((msg) => {
      setToast(msg);
      window.clearTimeout(flash._t);
      flash._t = window.setTimeout(() => setToast(""), 2400);
    }, []);

    const authIn = (u) => {
      try {sessionStorage.setItem("admin_user", u);} catch (e) {}
      setUser(u);
    };
    const logout = () => {
      try {sessionStorage.removeItem("admin_user");} catch (e) {}
      setUser(null);
    };

    // ---- project handlers ----
    const saveProject = async (p) => {
      const clean = { ...p };delete clean._new;
      await api.saveProject(clean);
      setProjects((list) => {
        const i = list.findIndex((x) => x.id === clean.id);
        if (i === -1) return [...list, clean];
        const next = list.slice();next[i] = clean;return next;
      });
      flash(p._new ? "Проект создан" : "Проект сохранён");
    };
    const deleteProject = async (id) => {
      await api.deleteProject(id);
      setProjects((list) => list.filter((x) => x.id !== id));
      flash("Проект удалён");
    };

    // ---- cert handlers ----
    const saveCert = async (c) => {
      const clean = { ...c };delete clean._new;
      await api.saveCert(clean);
      setCerts((list) => {
        const i = list.findIndex((x) => x.id === clean.id);
        if (i === -1) return [...list, clean];
        const next = list.slice();next[i] = clean;return next;
      });
      flash(c._new ? "Сертификат создан" : "Сертификат сохранён");
    };
    const deleteCert = async (id) => {
      await api.deleteCert(id);
      setCerts((list) => list.filter((x) => x.id !== id));
      flash("Сертификат удалён");
    };

    if (!user) {
      return (
        <div className={"aroot" + (dark ? " dark" : "")}>
          <Login onAuth={authIn} />
        </div>);

    }

    return (
      <div className={"aroot" + (dark ? " dark" : "")}>
        <div className="ashell">
          <header className="atop">
            <div className="atop-brand">
              <div className="atop-roundel">TZ</div>
              <div className="atop-titles">
                <span className="atop-title">Админка портфолио</span>
                <span className="atop-sub"></span>
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
            {tab === "projects" ?
            <ProjectsPanel
              projects={projects}
              lineMeta={lineMeta}
              onSave={saveProject}
              onDelete={deleteProject} /> :


            <CertsPanel
              certs={certs}
              groupMeta={groupMeta}
              onSave={saveCert}
              onDelete={deleteCert} />

            }
          </main>
        </div>

        <div className={"toast" + (toast ? " show" : "")}>
          <span className="tcheck">✓</span>{toast}
        </div>
      </div>);

  }

  ReactDOM.createRoot(document.getElementById("root")).render(<Admin />);
})();