import { useState, type FormEvent } from "react";
import { PlatformKind, type Platform } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { kindLabel, PLATFORM_KINDS } from "../../lib/labels";
import type { AddTarget } from "./model";

type Props = {
  platforms: Platform[];
  open: Set<string>;
  onToggle: (id: string) => void;
  adding: AddTarget | null;
  onStartAdd: (target: AddTarget | null) => void;
  /** Creates the node; rejects with a message to show inline. */
  onCreate: (target: AddTarget, name: string, kind: PlatformKind) => Promise<void>;
  selectedSubcategoryId: string | null;
  onSelectSubcategory: (id: string) => void;
};

export function TaxonomyTree(props: Props) {
  const { platforms, open, onToggle, adding, onStartAdd, selectedSubcategoryId, onSelectSubcategory } = props;
  const countCategory = (c: Platform["categories"][number]) => c.subcategories.reduce((n, s) => n + s.keyCount, 0);
  const countPlatform = (p: Platform) => p.categories.reduce((n, c) => n + countCategory(c), 0);

  return (
    <section className="pane" aria-labelledby="tree-h">
      <div className="pane-head">
        <h2 id="tree-h">Taxonomy</h2>
        <button className="btn ghost" type="button" onClick={() => onStartAdd({ level: "platform" })}>+ Language / platform</button>
      </div>
      <div className="tree">
        {adding?.level === "platform" && <AddForm target={adding} siblings={platforms.map((p) => p.name)} {...props} />}
        {platforms.length === 0 && !adding && <p className="empty">No languages or platforms yet. Add the first one, for example Java.</p>}
        {platforms.map((p) => {
          const pOpen = open.has(p.id);
          return (
            <div key={p.id}>
              <div className="trow lvl-p">
                <button type="button" className="tmain" aria-expanded={pOpen} onClick={() => onToggle(p.id)}>
                  <span className="chev">{pOpen ? "▾" : "▸"}</span>
                  <span className="tname">{p.name}</span>
                  <span className="kind">{kindLabel(p.kind)}</span>
                  <span className="count">{countPlatform(p)}</span>
                </button>
                <AddButton label={`Add category to ${p.name}`} onClick={() => onStartAdd({ level: "category", platformId: p.id })} />
              </div>
              {pOpen && (
                <>
                  {adding?.level === "category" && adding.platformId === p.id && (
                    <AddForm target={adding} siblings={p.categories.map((c) => c.name)} {...props} />
                  )}
                  {p.categories.length === 0 && !adding && <p className="empty">No categories yet. Use + to add one.</p>}
                  {p.categories.map((c) => {
                    const cOpen = open.has(c.id);
                    return (
                      <div key={c.id}>
                        <div className="trow lvl-c">
                          <button type="button" className="tmain" aria-expanded={cOpen} onClick={() => onToggle(c.id)}>
                            <span className="chev">{cOpen ? "▾" : "▸"}</span>
                            <span className="tname">{c.name}</span>
                            <span className="count">{countCategory(c)}</span>
                          </button>
                          <AddButton label={`Add subcategory to ${c.name}`} onClick={() => onStartAdd({ level: "subcategory", platformId: p.id, categoryId: c.id })} />
                        </div>
                        {cOpen && (
                          <>
                            {adding?.level === "subcategory" && adding.categoryId === c.id && (
                              <AddForm target={adding} siblings={c.subcategories.map((s) => s.name)} {...props} />
                            )}
                            {c.subcategories.map((s) => {
                              const selected = s.id === selectedSubcategoryId;
                              return (
                                <div key={s.id} className={"trow lvl-s" + (selected ? " selected" : "")}>
                                  <button type="button" className="tmain" aria-current={selected || undefined} onClick={() => onSelectSubcategory(s.id)}>
                                    <span className="tname">{s.name}</span>
                                    <span className="count">{s.keyCount}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="tree-legend">
        <span>Language / platform › Category › Subcategory</span>
        <span>Use + on a row to add a child.</span>
      </div>
    </section>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="tadd" aria-label={label} title={label} onClick={onClick}>+</button>;
}

const COPY = {
  platform: { label: "New language / platform", placeholder: "e.g. Python, AWS, React" },
  category: { label: "New category", placeholder: "e.g. Streams API" },
  subcategory: { label: "New subcategory", placeholder: "e.g. Collectors" },
} as const;

function AddForm({ target, siblings, onCreate, onStartAdd }: Props & { target: AddTarget; siblings: string[] }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PlatformKind>(PlatformKind.LANGUAGE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = COPY[target.level];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name.");
    if (siblings.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return setError(`"${trimmed}" already exists here.`);
    setBusy(true);
    try {
      await onCreate(target, trimmed, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="inline-add" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onStartAdd(null)}>
      <label htmlFor="new-node-name">{copy.label}</label>
      <div className="row">
        <input id="new-node-name" type="text" placeholder={copy.placeholder} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {target.level === "platform" && (
          <select id="new-node-kind" aria-label="Type" value={kind} onChange={(e) => setKind(Number(e.target.value) as PlatformKind)}>
            {PLATFORM_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        )}
      </div>
      {error && <p className="err">{error}</p>}
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
        <button className="btn" type="button" onClick={() => onStartAdd(null)}>Cancel</button>
      </div>
    </form>
  );
}
