import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Key, Platform } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { catalogClient, taxonomyClient } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { difficultyLabel } from "../../lib/labels";
import { useDebounced } from "../../lib/useDebounced";

export function LearnPage() {
  const [query, setQuery] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounced = useDebounced(query, 250);

  useEffect(() => {
    taxonomyClient.listTree({}).then((t) => setPlatforms(t.platforms)).catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    catalogClient
      .searchKeys({ query: debounced.trim(), platformId, limit: 50 }, { signal: ctrl.signal })
      .then((res) => {
        setKeys(res.keys);
        setError("");
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [debounced, platformId]);

  return (
    <>
      <div className="page-head">
        <h1>Look up a topic</h1>
        <p>Search interview keys by name or alias, then open one for its definition, a Java example and an explanation from Haiku.</p>
      </div>
      <div className="search-bar">
        <input type="search" id="learn-search" placeholder="e.g. HashMap, volatile, consumer group" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search keys" autoFocus />
        <select id="learn-platform" value={platformId} onChange={(e) => setPlatformId(e.target.value)} aria-label="Filter by language or platform">
          <option value="">All languages and platforms</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {error && <p className="alert">{error}</p>}
      {!error && !loading && keys.length === 0 && (
        <p className="empty">{query ? `No published keys match "${query}".` : "No published keys yet. Add and publish some in Studio."}</p>
      )}
      <ul className="results" aria-busy={loading}>
        {keys.map((k) => (
          <li key={k.id}>
            <Link className="result" to={`/keys/${k.id}`}>
              {k.path && <span className="crumb">{k.path.platformName} › {k.path.categoryName} › {k.path.subcategoryName}</span>}
              <span className="row"><span className="term">{k.term}</span><span className="diff">{difficultyLabel(k.difficulty)}</span></span>
              <span className="def">{k.shortDefinition}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
