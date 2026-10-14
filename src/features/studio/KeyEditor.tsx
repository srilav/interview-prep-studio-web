import { useState, type FormEvent } from "react";
import { KeyStatus, type Key, type Platform } from "../../gen/prepstudio/catalog/v1/catalog_pb";
import { taxonomyClient } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { DIFFICULTIES, difficultyLabel, statusLabel, STATUSES } from "../../lib/labels";
import { KeyPreview } from "./KeyPreview";
import { emptyForm, findPath, SHORT_MAX, toForm, toKeyInit, type KeyForm } from "./model";

type Props = {
  /** The key being edited, or null to create a new one in `subcategoryId`. */
  existing: Key | null;
  subcategoryId: string;
  tree: Platform[];
  /** Keys already loaded for the current subcategory, for the duplicate check. */
  siblings: Key[];
  onSaved: (key: Key, created: boolean) => void;
  onDeleted: (key: Key) => void;
};

type Errors = { term?: string; short?: string; form?: string };

export function KeyEditor({ existing, subcategoryId, tree, siblings, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<KeyForm>(() => (existing ? toForm(existing) : emptyForm(subcategoryId)));
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof KeyForm>(field: K, value: KeyForm[K]) => setForm((f) => ({ ...f, [field]: value }));
  const path = findPath(tree, form.subcategoryId);
  const homePath = findPath(tree, existing?.subcategoryId ?? subcategoryId);

  function validate(): Errors {
    const e: Errors = {};
    const term = form.term.trim();
    if (!term) e.term = "Enter the key term.";
    else if (
      form.subcategoryId === subcategoryId &&
      siblings.some((k) => k.id !== existing?.id && k.term.toLowerCase() === term.toLowerCase())
    ) e.term = `"${term}" already exists in ${path?.subcategoryName}. Edit that key instead.`;
    const short = form.shortDefinition.trim();
    if (!short) e.short = "Add a short definition so the key shows in search.";
    else if (short.length > SHORT_MAX) e.short = `Shorten by ${short.length - SHORT_MAX} characters. Put the rest in the detailed explanation.`;
    return e;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (found.term || found.short) {
      setView("edit");
      document.getElementById(found.term ? "f-term" : "f-short")?.focus();
      return;
    }
    setSaving(true);
    try {
      // Upsert in the key's current home, then move it if the placement changed.
      const home = existing?.subcategoryId ?? form.subcategoryId;
      let saved = await taxonomyClient.upsertKey({ key: toKeyInit(form, existing?.id ?? "", home) });
      if (existing && form.subcategoryId !== existing.subcategoryId) {
        saved = await taxonomyClient.moveKey({ keyId: saved.id, targetSubcategoryId: form.subcategoryId });
      }
      onSaved(saved, !existing);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setSaving(false);
    }
  }

  async function draftWithHaiku() {
    const term = form.term.trim();
    if (!term) {
      setErrors({ term: "Enter a term first, then Haiku can draft the rest." });
      document.getElementById("f-term")?.focus();
      return;
    }
    setDrafting(true);
    setErrors({});
    try {
      const d = await taxonomyClient.generateKeyDraft({ subcategoryId: form.subcategoryId, term, difficulty: form.difficulty });
      setForm((f) => ({
        ...f,
        shortDefinition: f.shortDefinition.trim() ? f.shortDefinition : d.shortDefinition,
        detail: f.detail.trim() ? f.detail : d.detail,
        javaExample: f.javaExample.trim() ? f.javaExample : d.javaExample,
        status: KeyStatus.DRAFT,
      }));
      setAiDraft(true);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setDrafting(false);
    }
  }

  async function remove() {
    if (!existing) return;
    try {
      await taxonomyClient.deleteKey({ keyId: existing.id });
      onDeleted(existing);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setConfirmDelete(false);
    }
  }

  const shortLen = form.shortDefinition.length;

  return (
    <section className="pane" aria-label="Key editor">
      <div className="pane-head">
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{existing ? "Editing key" : "New key"}</p>
          {homePath && <div className="edit-crumb">{homePath.platformName} › {homePath.categoryName} › {homePath.subcategoryName}</div>}
        </div>
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" type="button" aria-selected={view === "edit"} onClick={() => setView("edit")}>Edit</button>
          <button className="tab" role="tab" type="button" aria-selected={view === "preview"} onClick={() => setView("preview")}>Learner preview</button>
        </div>
      </div>

      {view === "preview" ? (
        <KeyPreview form={form} path={path} />
      ) : (
        <form className="editor" onSubmit={save} noValidate>
          {aiDraft && (
            <div className="ai-banner">
              <strong>Draft from Haiku. </strong>It filled only the empty fields. Review it before you publish. Status was set to Draft.
            </div>
          )}
          {errors.form && <p className="alert">{errors.form}</p>}
          <div className="grid2">
            <div className="field">
              <label htmlFor="f-term">Key (term) <span className="req">*</span></label>
              <input type="text" id="f-term" placeholder="e.g. ConcurrentHashMap" autoComplete="off" value={form.term} onChange={(e) => set("term", e.target.value)} />
              {errors.term && <p className="err">{errors.term}</p>}
            </div>
            <div className="field">
              <label htmlFor="f-aliases">Aliases</label>
              <input type="text" id="f-aliases" placeholder="Comma separated, e.g. CHM" value={form.aliases} onChange={(e) => set("aliases", e.target.value)} />
              <p className="hint">Learners can find the key by any alias.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-short">Short definition <span className="req">*</span></label>
            <textarea id="f-short" rows={2} placeholder="One or two sentences a candidate could say out loud in an interview." value={form.shortDefinition} onChange={(e) => set("shortDefinition", e.target.value)} />
            <p className="hint"><span>Shown in search results and flashcards.</span><span className={shortLen > SHORT_MAX ? "over" : ""}>{shortLen} / {SHORT_MAX}</span></p>
            {errors.short && <p className="err">{errors.short}</p>}
          </div>

          <div className="field">
            <label htmlFor="f-detail">Detailed explanation</label>
            <textarea id="f-detail" rows={5} placeholder="How it works, trade-offs, complexity, common pitfalls. Markdown supported." value={form.detail} onChange={(e) => set("detail", e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="f-code">Java example</label>
            <textarea id="f-code" className="code-input" rows={7} spellCheck={false} placeholder="// Compilable Java 21 snippet" value={form.javaExample} onChange={(e) => set("javaExample", e.target.value)} />
          </div>

          <div className="grid2">
            <div className="field">
              <span className="lbl" id="diff-lbl">Difficulty</span>
              <div className="seg" role="radiogroup" aria-labelledby="diff-lbl">
                {DIFFICULTIES.map((d) => (
                  <label key={d}>
                    <input type="radio" name="difficulty" id={`d-${d}`} checked={form.difficulty === d} onChange={() => set("difficulty", d)} />
                    {difficultyLabel(d)}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-status">Status</label>
              <select id="f-status" value={form.status} onChange={(e) => set("status", Number(e.target.value) as KeyStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-tags">Tags</label>
              <input type="text" id="f-tags" placeholder="Comma separated" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-related">Related keys</label>
              <input type="text" id="f-related" placeholder="Comma separated key names" value={form.relatedTerms} onChange={(e) => set("relatedTerms", e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-place">Placement <span className="req">*</span></label>
            <select id="f-place" value={form.subcategoryId} onChange={(e) => set("subcategoryId", e.target.value)}>
              {tree.flatMap((p) =>
                p.categories
                  .filter((c) => c.subcategories.length > 0)
                  .map((c) => (
                    <optgroup key={c.id} label={`${p.name} › ${c.name}`}>
                      {c.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  )),
              )}
            </select>
            <p className="hint">Language / platform › Category › Subcategory. Change it to move the key.</p>
          </div>

          <div className="actions">
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save key"}</button>
            <button className="btn ai" type="button" onClick={draftWithHaiku} disabled={drafting}>{drafting ? "Drafting…" : "Draft with Haiku"}</button>
            <span className="spacer" />
            {existing && !confirmDelete && <button className="btn danger" type="button" onClick={() => setConfirmDelete(true)}>Delete</button>}
            {existing && confirmDelete && (
              <div className="confirm">
                <span>Delete "{existing.term}"? This can't be undone.</span>
                <button className="btn danger-solid" type="button" onClick={remove}>Delete</button>
                <button className="btn" type="button" onClick={() => setConfirmDelete(false)} autoFocus>Keep</button>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
