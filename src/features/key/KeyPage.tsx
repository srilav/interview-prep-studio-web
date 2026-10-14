import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { Difficulty, type Key } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { catalogClient, learningClient } from "../../lib/clients";
import { errorMessage, isAbort } from "../../lib/errors";
import { DIFFICULTIES, difficultyLabel } from "../../lib/labels";
import { useLearner } from "../../lib/learner";
import { DiscussionPanel } from "../discussion/DiscussionPanel";

export function KeyPage() {
  const { keyId = "" } = useParams();
  const [key, setKey] = useState<Key | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setKey(null);
    setError("");
    catalogClient.getKey({ keyId }).then(setKey).catch((e) => setError(errorMessage(e)));
  }, [keyId]);

  if (error) return <p className="alert">{error} <Link to="/">Back to search</Link></p>;
  if (!key) return <p className="empty">Loading key…</p>;

  return (
    <div className="key-layout">
      <div className="key-main">
        <article className="key-card">
          {key.path && <p className="eyebrow">{key.path.platformName} › {key.path.categoryName} › {key.path.subcategoryName}</p>}
          <h1>{key.term}</h1>
          <div className="row">
            <span className="diff">{difficultyLabel(key.difficulty)}</span>
            {key.aliases.length > 0 && <span className="muted">Also: {key.aliases.join(", ")}</span>}
          </div>
          <p className="lede">{key.shortDefinition}</p>
          {key.detail && (<><h4>How it works</h4><p className="body">{key.detail}</p></>)}
          {key.javaExample && (<><h4>Java example</h4><pre className="codeblock">{key.javaExample}</pre></>)}
          {key.relatedTerms.length > 0 && (<><h4>Related keys</h4><div className="tag-row">{key.relatedTerms.map((t) => <span key={t}>{t}</span>)}</div></>)}
        </article>
        <Explanation keyId={key.id} initialLevel={key.difficulty} />
      </div>
      <DiscussionPanel keyId={key.id} term={key.term} />
    </div>
  );
}

function Explanation({ keyId, initialLevel }: { keyId: string; initialLevel: Difficulty }) {
  const { name } = useLearner();
  const [level, setLevel] = useState<Difficulty>(initialLevel === Difficulty.DIFFICULTY_UNSPECIFIED ? Difficulty.MEDIUM : initialLevel);
  const [markdown, setMarkdown] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  async function explain(regenerate: boolean) {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setMarkdown("");
    setError("");
    setVersion(0);
    setStreaming(true);
    try {
      for await (const chunk of learningClient.streamExplanation({ keyId, level, regenerate, requestedBy: name }, { signal: ctrl.signal })) {
        const p = chunk.payload;
        if (p.case === "markdownDelta") setMarkdown((m) => m + p.value);
        else if (p.case === "completed") {
          setMarkdown(p.value.markdown);
          setVersion(p.value.version);
        } else if (p.case === "error") setError(p.value);
      }
    } catch (e) {
      if (!isAbort(e)) setError(errorMessage(e));
    } finally {
      if (ctrlRef.current === ctrl) setStreaming(false);
    }
  }

  return (
    <section className="key-card" aria-labelledby="explain-h">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="explain-h" style={{ fontSize: "1.1rem" }}>Explanation</h2>
        {version > 0 && <span className="muted" style={{ fontSize: ".8rem" }}>Version {version}</span>}
      </div>
      <div className="explain-bar">
        <label htmlFor="explain-level" className="muted">Level</label>
        <select id="explain-level" value={level} onChange={(e) => setLevel(Number(e.target.value) as Difficulty)} disabled={streaming}>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{difficultyLabel(d)}</option>)}
        </select>
        <button type="button" className="btn primary" onClick={() => explain(false)} disabled={streaming}>
          {streaming ? "Explaining…" : "Explain with Haiku"}
        </button>
        {markdown && !streaming && <button type="button" className="btn" onClick={() => explain(true)}>Regenerate</button>}
        {streaming && <button type="button" className="btn" onClick={() => ctrlRef.current?.abort()}>Stop</button>}
      </div>
      {error && <p className="alert">{error}</p>}
      {markdown ? (
        <div className={"md" + (streaming ? " cursor" : "")}><Markdown>{markdown}</Markdown></div>
      ) : (
        !streaming && <p className="muted" style={{ margin: 0 }}>Get a summary, key points, complexity, pitfalls and a runnable Java example, pitched at the level you choose. Saved explanations load instantly.</p>
      )}
    </section>
  );
}
