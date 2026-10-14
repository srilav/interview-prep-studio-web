import { KeyStatus, type Key } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { difficultyLabel, statusClass, statusLabel, STATUSES } from "../../lib/labels";
import type { TreePath } from "./model";

type Props = {
  path: TreePath;
  keys: Key[];
  loading: boolean;
  error: string;
  query: string;
  onQuery: (q: string) => void;
  filter: KeyStatus;
  onFilter: (s: KeyStatus) => void;
  selectedKeyId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

export function KeyList({ path, keys, loading, error, query, onQuery, filter, onFilter, selectedKeyId, onSelect, onNew }: Props) {
  const q = query.trim().toLowerCase();
  const visible = keys.filter(
    (k) =>
      (filter === KeyStatus.KEY_STATUS_UNSPECIFIED || k.status === filter) &&
      (!q || k.term.toLowerCase().includes(q) || k.aliases.some((a) => a.toLowerCase().includes(q))),
  );
  const chips: { status: KeyStatus; label: string; n: number }[] = [
    { status: KeyStatus.KEY_STATUS_UNSPECIFIED, label: "All", n: keys.length },
    ...STATUSES.map((s) => ({ status: s, label: statusLabel(s), n: keys.filter((k) => k.status === s).length })),
  ];

  return (
    <section className="pane" aria-labelledby="keys-title">
      <div className="pane-head">
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{path.platformName} › {path.categoryName}</p>
          <h2 id="keys-title">{path.subcategoryName}</h2>
        </div>
        <button className="btn primary" type="button" onClick={onNew}>+ New key</button>
      </div>
      <div className="list-tools">
        <input type="search" id="key-search" placeholder="Search keys and aliases" aria-label="Search keys" value={query} onChange={(e) => onQuery(e.target.value)} />
        <div className="chips" role="group" aria-label="Filter by status">
          {chips.map((c) => (
            <button key={c.status} type="button" className="chip" aria-pressed={filter === c.status} onClick={() => onFilter(c.status)}>
              {c.label} {c.n}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="alert" style={{ margin: "0 16px 12px" }}>{error}</p>}
      <ul className="keys" aria-busy={loading}>
        {!loading && keys.length === 0 && <li className="empty">No keys in {path.subcategoryName} yet. Fill in the editor to add the first one.</li>}
        {keys.length > 0 && visible.length === 0 && <li className="empty">No keys match this search or filter.</li>}
        {visible.map((k) => (
          <li key={k.id}>
            <button type="button" className={"key-item" + (k.id === selectedKeyId ? " selected" : "")} onClick={() => onSelect(k.id)}>
              <div className="key-top">
                <span className="key-term">{k.term}</span>
                <span className={statusClass(k.status)}>{statusLabel(k.status)}</span>
                <span className="diff">{difficultyLabel(k.difficulty)}</span>
              </div>
              <div className="key-def">{k.shortDefinition}</div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
