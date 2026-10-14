import { useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useLearner } from "./lib/learner";
import { LearnPage } from "./features/learn/LearnPage";
import { KeyPage } from "./features/key/KeyPage";
import { StudioPage } from "./features/studio/StudioPage";
import { ProgressPage } from "./features/progress/ProgressPage";

export function App() {
  const { name } = useLearner();
  const [editingName, setEditingName] = useState(false);

  if (!name || editingName) return <NameGate onDone={() => setEditingName(false)} />;

  return (
    <div className="shell">
      <header className="nav">
        <Link to="/" className="brand">Prep Studio</Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Learn</NavLink>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/progress">Progress</NavLink>
        </nav>
        <div className="who">
          <span>Signed in as <strong>{name}</strong></span>
          <button type="button" className="btn link" onClick={() => setEditingName(true)}>Change</button>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<LearnPage />} />
          <Route path="/keys/:keyId" element={<KeyPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<p className="empty">Page not found. <Link to="/">Go to Learn</Link></p>} />
        </Routes>
      </main>
    </div>
  );
}

function NameGate({ onDone }: { onDone: () => void }) {
  const { name, setName } = useLearner();
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Enter a display name.");
      return;
    }
    setName(value);
    onDone();
  }

  return (
    <form className="name-gate" onSubmit={submit}>
      <h1>Prep Studio</h1>
      <p>Pick a display name. Others see it in discussions, and your progress is tracked under it.</p>
      <label htmlFor="learner-name" className="eyebrow">Display name</label>
      <div className="row">
        <input id="learner-name" type="text" value={value} onChange={(e) => setValue(e.target.value)} autoFocus maxLength={40} />
        <button className="btn primary" type="submit">Continue</button>
      </div>
      {error && <p className="err">{error}</p>}
    </form>
  );
}
