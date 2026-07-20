import { useEffect, useMemo, useRef, useState } from "react";

const emptyForm = {
  host: "",
  port: "22",
  username: "",
  password: "",
};

const emptyMt = {
  host: "",
  port: "8728",
  username: "",
  password: "",
};

const STEP_LABELS = [
  { n: 1, title: "Koneksi Server" },
  { n: 2, title: "Setup L2TP" },
  { n: 3, title: "Logo & Warna" },
  { n: 4, title: "Instalasi" },
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [presets, setPresets] = useState([]);
  const [presetId, setPresetId] = useState("teal");
  const [customAccent, setCustomAccent] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [testing, setTesting] = useState(false);
  const [testingMt, setTestingMt] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMtPassword, setShowMtPassword] = useState(false);
  const [conn, setConn] = useState(null);
  const [mtConn, setMtConn] = useState(null);
  const [msg, setMsg] = useState(null);
  const [logs, setLogs] = useState([]);
  const [access, setAccess] = useState(null);
  const [deployTheme, setDeployTheme] = useState(null);
  const [enableL2tp, setEnableL2tp] = useState(false);
  const [selectedSubnets, setSelectedSubnets] = useState([]);
  const [mt, setMt] = useState(emptyMt);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAuthEnabled(Boolean(d.authEnabled));
        setAuthenticated(!d.authEnabled || Boolean(d.authenticated));
        setAuthUser(d.user || "");
      })
      .catch(() => {
        setAuthEnabled(false);
        setAuthenticated(true);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/presets", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .catch(() => setPresets([]));
  }, [authenticated]);

  async function onLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError(data.error || "Login gagal");
        return;
      }
      setAuthenticated(true);
      setAuthUser(data.user || loginForm.username);
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      setLoginError(err.message || "Login gagal");
    } finally {
      setLoggingIn(false);
    }
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    setAuthenticated(false);
    setAuthUser("");
    setStep(1);
    setAccess(null);
    setLogs([]);
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const selected = useMemo(
    () => presets.find((p) => p.id === presetId) || presets[0],
    [presets, presetId]
  );

  const accent =
    customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent)
      ? customAccent
      : selected?.accent || "#1f6467";

  const canInstall = conn?.ok && !conn.hasAcs;
  const modemSubnets = selectedSubnets.join(",");
  const detectedNetworks = mtConn?.networks || [];

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateMt(key, value) {
    setMt((f) => ({ ...f, [key]: value }));
    setMtConn(null);
    setSelectedSubnets([]);
  }

  function toggleSubnet(subnet) {
    setSelectedSubnets((prev) =>
      prev.includes(subnet) ? prev.filter((s) => s !== subnet) : [...prev, subnet]
    );
  }

  function pushLog(line) {
    const ts = new Date().toLocaleTimeString("id-ID", { hour12: false });
    setLogs((prev) => [...prev, { ts, line }]);
  }

  async function onTest(e) {
    e.preventDefault();
    setTesting(true);
    setMsg(null);
    setConn(null);
    try {
      const res = await fetch("/api/test-connection", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Koneksi gagal");
      setConn(data);
      if (data.hasAcs) {
        setMsg({
          type: "err",
          text: "Di server ini ACS sudah terpasang. Gunakan server baru yang belum ada ACS.",
        });
      } else {
        setMsg({
          type: "ok",
          text: `Berhasil terhubung ke ${data.hostname || form.host}. Silakan lanjut.`,
        });
      }
    } catch (err) {
      setConn(null);
      setMsg({ type: "err", text: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function onTestMt(e) {
    e.preventDefault();
    setTestingMt(true);
    setMtConn(null);
    setSelectedSubnets([]);
    setMsg(null);
    try {
      const res = await fetch("/api/test-mikrotik", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mt),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Koneksi MikroTik gagal");
      setMtConn(data);
      const nets = (data.networks || []).map((n) => n.subnet);
      setSelectedSubnets(nets);
      if (!nets.length) {
        setMsg({
          type: "err",
          text: "Terhubung ke MikroTik, tetapi belum ada jaringan LAN yang terdeteksi. Periksa IP address di router.",
        });
      } else {
        setMsg({
          type: "ok",
          text: `${data.message}. Jaringan perangkat dibaca otomatis dari MikroTik.`,
        });
      }
    } catch (err) {
      setMtConn(null);
      setMsg({ type: "err", text: err.message });
    } finally {
      setTestingMt(false);
    }
  }

  function onLogoChange(file) {
    setLogoFile(file || null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  }

  async function onDeploy() {
    if (!canInstall) return;
    if (enableL2tp) {
      if (!mtConn?.ok) {
        setMsg({
          type: "err",
          text: "Uji koneksi MikroTik terlebih dahulu hingga berhasil.",
        });
        return;
      }
      if (!selectedSubnets.length) {
        setMsg({
          type: "err",
          text: "Belum ada jaringan perangkat yang dipilih dari hasil baca MikroTik.",
        });
        return;
      }
    }

    setDeploying(true);
    setAccess(null);
    setDeployTheme(null);
    setLogs([]);
    setMsg(null);
    pushLog("Memulai instalasi ACS…");

    try {
      const fd = new FormData();
      fd.append("host", form.host);
      fd.append("port", form.port);
      fd.append("username", form.username);
      fd.append("password", form.password);
      fd.append("presetId", presetId);
      fd.append("mode", "install");
      fd.append("enableL2tp", enableL2tp ? "1" : "0");
      fd.append("modemSubnets", modemSubnets);
      if (enableL2tp) {
        fd.append("mtHost", mt.host);
        fd.append("mtPort", mt.port);
        fd.append("mtUsername", mt.username);
        fd.append("mtPassword", mt.password);
      }
      if (customAccent) fd.append("customAccent", customAccent);
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch("/api/deploy", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          let evt;
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          if (evt.type === "log") pushLog(evt.line);
          if (evt.type === "error") throw new Error(evt.error || "Instalasi gagal");
          if (evt.type === "done") {
            setAccess(evt.access || null);
            setDeployTheme(evt.theme || null);
            setMsg({
              type: "ok",
              text: "Instalasi berhasil. Simpan informasi akses di bawah ini.",
            });
          }
        }
      }
    } catch (err) {
      pushLog("ERROR: " + err.message);
      setMsg({ type: "err", text: err.message });
    } finally {
      setDeploying(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setAccess(null);
    setLogs([]);
    setMsg(null);
    setDeployTheme(null);
    setMtConn(null);
    setSelectedSubnets([]);
  }

  function PasswordToggle({ show, onToggle }) {
    return (
      <button
        type="button"
        className="password-toggle"
        onClick={onToggle}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
      >
        {show ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.89 2.98-5.17 5.47-6.53" />
            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.7 11.7 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="page">
      <div className="aurora" aria-hidden="true" />
      <div className="grid-bg" aria-hidden="true" />

      <div className={`shell${!authReady || !authenticated ? " shell-login" : ""}`}>
        <header className="top">
          <p className="eyebrow">BillingHub</p>
          <h1 className="brand">
            ACS <em>Studio</em>
          </h1>
          {authenticated && (
            <p className="tagline">
              Pasang ACS BillingHub di server baru, lengkap dengan logo dan warna Anda.
            </p>
          )}
        </header>

        {!authReady ? (
          <main className="stage">
            <section className="panel login-panel">
              <p className="muted" style={{ textAlign: "center", margin: 0 }}>
                Memuat…
              </p>
            </section>
          </main>
        ) : !authenticated ? (
          <main className="stage">
            <section className="panel login-panel">
              <div className="panel-head">
                <h2>Masuk</h2>
                <p>Masukkan username dan password ACS Studio untuk melanjutkan.</p>
              </div>
              <form onSubmit={onLogin}>
                <div className="field">
                  <label htmlFor="studio-user">Username</label>
                  <input
                    id="studio-user"
                    type="text"
                    autoComplete="username"
                    value={loginForm.username}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, username: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="studio-pass">Password</label>
                  <div className="password-wrap">
                    <input
                      id="studio-pass"
                      type={showLoginPass ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, password: e.target.value }))
                      }
                      required
                    />
                    <PasswordToggle
                      show={showLoginPass}
                      onToggle={() => setShowLoginPass((v) => !v)}
                    />
                  </div>
                </div>
                {loginError && <p className="banner err">{loginError}</p>}
                <button type="submit" className="btn btn-primary" disabled={loggingIn}>
                  {loggingIn ? "Memeriksa…" : "Masuk"}
                </button>
              </form>
            </section>
          </main>
        ) : (
          <>
        {authEnabled && (
          <div className="auth-bar">
            <span>
              Masuk sebagai <strong>{authUser || "admin"}</strong>
            </span>
            <button type="button" className="btn ghost small" onClick={onLogout}>
              Keluar
            </button>
          </div>
        )}

        <nav className="wizard-rail wizard-rail-4" aria-label="Langkah">
          {STEP_LABELS.map((s) => {
            const state = step === s.n ? "active" : step > s.n ? "done" : "";
            return (
              <div key={s.n} className={`rail-item ${state}`}>
                <div className="rail-num">{step > s.n ? "✓" : s.n}</div>
                <div className="rail-meta">
                  <span>Langkah {s.n}</span>
                  <strong>{s.title}</strong>
                </div>
              </div>
            );
          })}
        </nav>

        <main className="stage" key={step}>
          {step === 1 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Koneksi Server</h2>
                <p>
                  Masukkan akses server yang akan dipasangi ACS. Gunakan server yang belum
                  memiliki ACS.
                </p>
              </div>

              <form className="form" onSubmit={onTest}>
                <div className="field">
                  <label>IP / Host</label>
                  <input required value={form.host} onChange={(e) => update("host", e.target.value)} autoComplete="off" />
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Port</label>
                    <input required value={form.port} onChange={(e) => update("port", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Username</label>
                    <input required value={form.username} onChange={(e) => update("username", e.target.value)} autoComplete="username" />
                  </div>
                </div>
                <div className="field">
                  <label>Password</label>
                  <div className="password-wrap">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      autoComplete="current-password"
                    />
                    <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  </div>
                </div>
                <p className="field-note">
                  Gunakan akun yang memiliki <strong>hak akses penuh</strong> pada server
                  tersebut.
                </p>
                <button className="btn btn-primary" type="submit" disabled={testing}>
                  {testing ? "Menguji koneksi…" : "Uji koneksi"}
                </button>
              </form>

              {msg && step === 1 && <div className={`toast ${msg.type}`}>{msg.text}</div>}

              {conn?.ok && (
                <div className="conn-ok">
                  <div className="conn-ok-glow" />
                  <div>
                    <strong>Koneksi berhasil</strong>
                    <p>{conn.hostname || form.host}</p>
                    {canInstall ? (
                      <p className="conn-hint ok">Server siap. Anda dapat melanjutkan.</p>
                    ) : (
                      <p className="conn-hint">
                        ACS sudah terpasang di server ini. Gunakan server lain yang belum
                        memiliki ACS.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-next"
                    disabled={!canInstall}
                    onClick={() => {
                      setMsg(null);
                      setStep(2);
                    }}
                  >
                    Lanjut ke Setup L2TP →
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Setup L2TP · Ping MikroTik</h2>
                <p>
                  Opsional. Menyiapkan jalur agar server ACS dapat berkomunikasi dengan
                  MikroTik dan perangkat di bawahnya.
                </p>
              </div>

              <div className="info-box">
                <strong>Kapan perlu diaktifkan?</strong>
                <p>
                  Pasang L2TP jika server ACS (VPS) berada di jaringan berbeda dari MikroTik /
                  perangkat pelanggan. Dengan L2TP, VPS dapat menjangkau MikroTik beserta IP
                  perangkat di bawahnya (untuk ping &amp; Summon dari portal ACS).
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Lewati langkah ini</strong> jika ACS dipasang di jaringan yang sama
                  dengan MikroTik dan perangkat (satu LAN / sudah saling ping).
                </p>
              </div>

              <div className="choice-row">
                <button
                  type="button"
                  className={`choice ${!enableL2tp ? "selected" : ""}`}
                  onClick={() => setEnableL2tp(false)}
                >
                  <strong>Lewati</strong>
                  <small>ACS dan MikroTik sudah di jaringan yang sama</small>
                </button>
                <button
                  type="button"
                  className={`choice ${enableL2tp ? "selected" : ""}`}
                  onClick={() => setEnableL2tp(true)}
                >
                  <strong>Setup L2TP</strong>
                  <small>VPS perlu jalur ke MikroTik &amp; perangkat</small>
                </button>
              </div>

              {enableL2tp && (
                <div className="l2tp-block">
                  <h3 className="subhead">Koneksi API MikroTik</h3>
                  <p className="lead-sm">
                    Setelah terhubung, ACS Studio akan membaca sendiri jaringan IP perangkat
                    dari MikroTik — tanpa perlu mengisi subnet manual.
                  </p>

                  <div className="field">
                    <label>Host / IP</label>
                    <input value={mt.host} onChange={(e) => updateMt("host", e.target.value)} />
                  </div>
                  <div className="row-2">
                    <div className="field">
                      <label>Port API</label>
                      <input value={mt.port} onChange={(e) => updateMt("port", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Username</label>
                      <input value={mt.username} onChange={(e) => updateMt("username", e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <div className="password-wrap">
                      <input
                        type={showMtPassword ? "text" : "password"}
                        value={mt.password}
                        onChange={(e) => updateMt("password", e.target.value)}
                      />
                      <PasswordToggle show={showMtPassword} onToggle={() => setShowMtPassword((v) => !v)} />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={testingMt || !mt.host || !mt.username || !mt.password}
                    onClick={onTestMt}
                  >
                    {testingMt ? "Menguji & membaca jaringan…" : "Uji koneksi & baca jaringan"}
                  </button>

                  {mtConn?.ok && detectedNetworks.length > 0 && (
                    <div className="net-detect">
                      <h4>Jaringan terdeteksi dari MikroTik</h4>
                      <p className="lead-sm">
                        Centang jaringan yang berisi perangkat/ONT pelanggan. Data ini dipakai
                        untuk setup L2TP di server ACS dan di MikroTik.
                      </p>
                      <div className="net-list">
                        {detectedNetworks.map((n) => (
                          <label key={n.subnet} className={`net-item ${selectedSubnets.includes(n.subnet) ? "on" : ""}`}>
                            <input
                              type="checkbox"
                              checked={selectedSubnets.includes(n.subnet)}
                              onChange={() => toggleSubnet(n.subnet)}
                            />
                            <span>
                              <strong>{n.subnet}</strong>
                              <small>
                                {n.interface ? `${n.interface}` : "jaringan"}
                                {n.address ? ` · ${n.address}` : ""}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {msg && step === 2 && <div className={`toast ${msg.type}`}>{msg.text}</div>}

              <div className="actions split">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  ← Kembali
                </button>
                <button
                  type="button"
                  className="btn btn-next"
                  onClick={() => {
                    if (enableL2tp) {
                      if (!mtConn?.ok) {
                        setMsg({
                          type: "err",
                          text: "Uji koneksi MikroTik hingga berhasil, atau pilih Lewati.",
                        });
                        return;
                      }
                      if (!selectedSubnets.length) {
                        setMsg({
                          type: "err",
                          text: "Pilih minimal satu jaringan perangkat yang terdeteksi.",
                        });
                        return;
                      }
                    }
                    setMsg(null);
                    setStep(3);
                  }}
                >
                  Lanjut ke Logo &amp; Warna →
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Logo &amp; Warna</h2>
                <p>Sesuaikan tampilan ACS dengan identitas brand Anda.</p>
              </div>

              <div className="brand-grid">
                <div>
                  <div className="field">
                    <label>Unggah logo</label>
                    <label className="dropzone">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview logo" />
                      ) : (
                        <span>
                          Pilih gambar logo
                          <small>Format PNG atau JPG · maksimal 3 MB · bersifat opsional</small>
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => onLogoChange(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <label>Kode warna sendiri (opsional)</label>
                    <input
                      placeholder="#1f6467"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <div className="field">
                    <label>Pilih tema warna</label>
                    <div className="presets">
                      {presets.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className={`preset ${presetId === p.id && !customAccent ? "selected" : ""}`}
                          onClick={() => {
                            setPresetId(p.id);
                            setCustomAccent("");
                          }}
                        >
                          <div className="preset-swatch" style={{ background: p.preview }} />
                          <strong>{p.name}</strong>
                          <small>{p.accent}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="live-preview" style={{ "--live": accent }}>
                    <div className="live-bar">
                      <span className="live-dot" />
                      <span className="live-tab">Devices</span>
                      <span className="live-tab mute">Overview</span>
                    </div>
                    <div className="live-body">
                      {logoPreview && <img src={logoPreview} alt="" className="live-logo" />}
                      <p>
                        Warna terpilih <strong>{accent}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="actions split">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                  ← Kembali
                </button>
                <button
                  type="button"
                  className="btn btn-next"
                  onClick={() => {
                    setMsg(null);
                    setStep(4);
                  }}
                >
                  Lanjut ke Instalasi →
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Instalasi</h2>
                <p>Periksa ringkasan, lalu mulai pemasangan ACS di server Anda.</p>
              </div>

              <div className="summary">
                <div>
                  <span>Server</span>
                  <strong>{form.host}</strong>
                </div>
                <div>
                  <span>Setup L2TP</span>
                  <strong>
                    {enableL2tp
                      ? `Aktif · ${selectedSubnets.length} jaringan`
                      : "Dilewati"}
                  </strong>
                </div>
                <div>
                  <span>Warna</span>
                  <strong style={{ color: accent }}>
                    {customAccent ? `Custom ${customAccent}` : selected?.name || presetId}
                  </strong>
                </div>
                <div>
                  <span>Logo</span>
                  <strong>{logoFile ? logoFile.name : "Logo default BillingHub"}</strong>
                </div>
              </div>

              {enableL2tp && selectedSubnets.length > 0 && (
                <p className="lead-sm" style={{ marginTop: -4, marginBottom: 14 }}>
                  Jaringan dari MikroTik: {selectedSubnets.join(", ")}
                </p>
              )}

              <div className="actions split">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(3)} disabled={deploying}>
                  ← Kembali
                </button>
                <button type="button" className="btn btn-deploy" onClick={onDeploy} disabled={deploying || !canInstall}>
                  {deploying ? "Sedang memasang…" : access ? "Pasang ulang" : "Mulai instalasi"}
                </button>
              </div>

              <div className="log-panel">
                <div className="log-head">
                  <span>Status proses</span>
                  {deploying && <span className="pulse">BERJALAN</span>}
                </div>
                <div className="log-body">
                  {logs.length === 0 && (
                    <div className="log-empty">
                      Belum ada proses. Klik Mulai instalasi. Proses biasanya 5–15 menit.
                    </div>
                  )}
                  {logs.map((l, i) => (
                    <div key={i} className={`log-line ${String(l.line).startsWith("ERROR") ? "err" : ""}`}>
                      <time>{l.ts}</time>
                      <span>{l.line}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {msg && step === 4 && <div className={`toast ${msg.type}`}>{msg.text}</div>}

              {access && (
                <div className="done-card">
                  <div className="done-badge">Selesai</div>
                  <h3>ACS siap digunakan</h3>
                  <p className="done-sub">
                    Simpan informasi login di bawah. Buka portal ACS untuk mengelola perangkat
                    pelanggan
                    {enableL2tp ? " dan menggunakan Summon" : ""}.
                  </p>

                  <div className="access-grid">
                    <a className="access-item" href={access.ui} target="_blank" rel="noreferrer">
                      <span>Portal ACS</span>
                      <strong>{access.ui}</strong>
                    </a>
                    <div className="access-item">
                      <span>Alamat ACS untuk perangkat</span>
                      <strong>{access.cwmp}</strong>
                    </div>
                    <div className="access-item">
                      <span>API</span>
                      <strong>{access.nbi}</strong>
                    </div>
                    <div className="access-item login">
                      <span>Username / Password</span>
                      <strong>
                        {access.loginUser}
                        <em> / </em>
                        {access.loginPass}
                      </strong>
                    </div>
                  </div>

                  {access.l2tp && (
                    <div className="l2tp-done">
                      <h4>Setup L2TP</h4>
                      <p>
                        Jalur VPS ↔ MikroTik sudah disiapkan untuk jaringan{" "}
                        <code>{access.l2tp.modemSubnets}</code>. Setelah perangkat online,
                        Anda dapat mencoba Summon dari portal ACS.
                      </p>
                      <div className="access-grid">
                        <div className="access-item">
                          <span>User koneksi</span>
                          <strong>{access.l2tp.user}</strong>
                        </div>
                        <div className="access-item">
                          <span>Password koneksi</span>
                          <strong>{access.l2tp.pass}</strong>
                        </div>
                        <div className="access-item">
                          <span>Kunci IPsec</span>
                          <strong>{access.l2tp.psk}</strong>
                        </div>
                        {access.l2tp.tunnelRunning != null && (
                          <div className="access-item">
                            <span>Status koneksi</span>
                            <strong>
                              {access.l2tp.tunnelRunning ? "Terhubung" : "Belum terhubung"}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="actions split" style={{ marginTop: 18 }}>
                    <button type="button" className="btn btn-ghost" onClick={resetWizard}>
                      Instalasi baru
                    </button>
                    <a className="btn btn-next" href={access.ui} target="_blank" rel="noreferrer">
                      Buka portal ACS →
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>

        <p className="footer">ACS Studio · BillingHub — untuk pemasangan ACS di server baru.</p>
          </>
        )}
      </div>
    </div>
  );
}
