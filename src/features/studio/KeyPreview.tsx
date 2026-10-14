import { difficultyLabel, statusClass, statusLabel } from "../../lib/labels";
import { splitList, type KeyForm, type TreePath } from "./model";

export function KeyPreview({ form, path }: { form: KeyForm; path: TreePath | null }) {
  const aliases = splitList(form.aliases);
  const related = splitList(form.relatedTerms);
  const tags = splitList(form.tags);
  return (
    <article className="preview">
      {path && <div className="pcrumb">{path.platformName} › {path.categoryName} › {path.subcategoryName}</div>}
      <h3>{form.term || "Untitled key"}</h3>
      <div className="row">
        <span className="diff">{difficultyLabel(form.difficulty)}</span>
        <span className={statusClass(form.status)}>{statusLabel(form.status)}</span>
        {aliases.length > 0 && <span className="aka">Also: {aliases.join(", ")}</span>}
      </div>
      <p className="lede">{form.shortDefinition || "Short definition appears here."}</p>
      {form.detail && (<><h4>How it works</h4><p className="body">{form.detail}</p></>)}
      {form.javaExample && (<><h4>Java example</h4><pre className="codeblock">{form.javaExample}</pre></>)}
      {related.length > 0 && (<><h4>Related keys</h4><div className="tag-row">{related.map((r) => <span key={r}>{r}</span>)}</div></>)}
      {tags.length > 0 && (<><h4>Tags</h4><div className="tag-row">{tags.map((t) => <span key={t}>#{t}</span>)}</div></>)}
    </article>
  );
}
