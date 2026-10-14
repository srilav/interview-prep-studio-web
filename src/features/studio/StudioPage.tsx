import { useCallback, useEffect, useState } from "react";
import { KeyStatus, type Key, type Platform, type PlatformKind } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { taxonomyClient } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { KeyEditor } from "./KeyEditor";
import { KeyList } from "./KeyList";
import { TaxonomyTree } from "./TaxonomyTree";
import { findPath, type AddTarget } from "./model";

function firstSubcategory(tree: Platform[]): string | null {
  for (const p of tree) for (const c of p.categories) if (c.subcategories[0]) return c.subcategories[0].id;
  return null;
}

export function StudioPage() {
  const [tree, setTree] = useState<Platform[]>([]);
  const [treeError, setTreeError] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<AddTarget | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KeyStatus>(KeyStatus.KEY_STATUS_UNSPECIFIED);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? "" : t)), 2400);
  }, []);

  const loadTree = useCallback(async () => {
    try {
      const t = await taxonomyClient.listTree({});
      setTree(t.platforms);
      setTreeError("");
      return t.platforms;
    } catch (e) {
      setTreeError(errorMessage(e));
      return null;
    }
  }, []);

  const loadKeys = useCallback(async (subcategoryId: string, select?: string | null) => {
    setKeysLoading(true);
    try {
      const res = await taxonomyClient.listKeys({ subcategoryId });
      setKeys(res.keys);
      setKeysError("");
      const next = select !== undefined ? select : res.keys[0]?.id ?? null;
      setSelectedKeyId(next);
      setIsNew(next === null);
    } catch (e) {
      setKeys([]);
      setKeysError(errorMessage(e));
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree().then((t) => {
      if (!t) return;
      const first = firstSubcategory(t);
      const path = first ? findPath(t, first) : null;
      if (path) {
        setOpen(new Set([path.platformId, path.categoryId]));
        setSubId(path.subcategoryId);
      }
    });
  }, [loadTree]);

  useEffect(() => {
    if (subId) loadKeys(subId);
  }, [subId, loadKeys]);

  function selectSubcategory(id: string) {
    setQuery("");
    if (id === subId) loadKeys(id);
    else setSubId(id);
  }

  function toggle(id: string) {
    setOpen((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startAdd(target: AddTarget | null) {
    if (target?.level === "category") setOpen((s) => new Set(s).add(target.platformId));
    if (target?.level === "subcategory") setOpen((s) => new Set(s).add(target.categoryId));
    setAdding(target);
  }

  async function create(target: AddTarget, name: string, kind: PlatformKind) {
    try {
      if (target.level === "platform") {
        const p = await taxonomyClient.createPlatform({ name, kind });
        await loadTree();
        setOpen((s) => new Set(s).add(p.id));
        setAdding({ level: "category", platformId: p.id });
        showToast(`Added ${name}. Now add its first category.`);
      } else if (target.level === "category") {
        const c = await taxonomyClient.createCategory({ platformId: target.platformId, name });
        await loadTree();
        setOpen((s) => new Set(s).add(c.id));
        setAdding({ level: "subcategory", platformId: target.platformId, categoryId: c.id });
        showToast(`Added category ${name}. Now add a subcategory.`);
      } else {
        const s = await taxonomyClient.createSubcategory({ platformId: target.platformId, categoryId: target.categoryId, name });
        await loadTree();
        setAdding(null);
        selectSubcategory(s.id);
        showToast(`Added subcategory ${name}.`);
      }
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  async function onSaved(key: Key, created: boolean) {
    const t = await loadTree();
    if (t) {
      const path = findPath(t, key.subcategoryId);
      if (path) setOpen((s) => new Set(s).add(path.platformId).add(path.categoryId));
    }
    if (key.subcategoryId !== subId) setSubId(key.subcategoryId);
    await loadKeys(key.subcategoryId, key.id);
    showToast(created ? `Added ${key.term}` : `Saved ${key.term}`);
  }

  async function onDeleted(key: Key) {
    await loadTree();
    if (subId) await loadKeys(subId);
    showToast(`Deleted ${key.term}`);
  }

  const path = subId ? findPath(tree, subId) : null;
  const selected = isNew ? null : keys.find((k) => k.id === selectedKeyId) ?? null;

  return (
    <>
      <div className="page-head">
        <h1>Prep Studio</h1>
        <p>Organise languages and platforms into categories, then write the keys and definitions learners study.</p>
      </div>
      {treeError && <p className="alert" style={{ marginBottom: 16 }}>{treeError}</p>}
      <div className="studio">
        <TaxonomyTree
          platforms={tree}
          open={open}
          onToggle={toggle}
          adding={adding}
          onStartAdd={startAdd}
          onCreate={create}
          selectedSubcategoryId={subId}
          onSelectSubcategory={selectSubcategory}
        />
        {path ? (
          <>
            <KeyList
              path={path}
              keys={keys}
              loading={keysLoading}
              error={keysError}
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
              selectedKeyId={isNew ? null : selectedKeyId}
              onSelect={(id) => { setSelectedKeyId(id); setIsNew(false); }}
              onNew={() => { setIsNew(true); setSelectedKeyId(null); }}
            />
            {!keysLoading && (
              <KeyEditor
                key={isNew ? `new-${subId}` : selectedKeyId ?? "none"}
                existing={selected}
                subcategoryId={path.subcategoryId}
                tree={tree}
                siblings={keys}
                onSaved={onSaved}
                onDeleted={onDeleted}
              />
            )}
          </>
        ) : (
          !treeError && <p className="empty" style={{ gridColumn: "span 2" }}>Add a language or platform, a category and a subcategory, then start writing keys.</p>
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
