import { useState } from "react";
import "./styles/global.css";
import { getUsername, clearUsername } from "./lib/user";
import Login from "./components/Login";
import { FEATURES } from "./features/registry";

export default function App() {
  const [username, setUser] = useState<string | null>(getUsername());
  const [activeId, setActiveId] = useState<string>(FEATURES[0].id);

  if (!username) return <Login onLogin={setUser} />;

  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];
  const ActiveComponent = active.Component;

  function switchUser() {
    clearUsername();
    setUser(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <WaveMark />
          <span className="brand-name">Naiadex</span>
        </div>
        <div className="user-chip">
          <span className="user-name">{username}</span>
          <button className="link-btn" onClick={switchUser}>switch</button>
        </div>
      </header>

      <nav className="feature-tabs" aria-label="Features">
        {FEATURES.map((f) => (
          <button
            key={f.id}
            className={`tab ${f.id === active.id ? "tab-active" : ""}`}
            onClick={() => setActiveId(f.id)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <p className="feature-tagline">{active.tagline}</p>
        <ActiveComponent />
      </main>
    </div>
  );
}

function WaveMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="13" fill="var(--accent-soft)" />
      <path d="M4 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 10c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}