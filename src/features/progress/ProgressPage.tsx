import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ProgressSummary } from "../../gen/prepstudio/progress/v1/progress_pb";
import { progressClient } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { useLearner } from "../../lib/learner";

const ACTIVITY_LABELS: Record<string, string> = {
  EXPLANATION_VIEWED: "Studied an explanation",
  MESSAGE_POSTED: "Posted in a discussion",
};

export function ProgressPage() {
  const { name } = useLearner();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    progressClient.getSummary({ learner: name }).then(setSummary).catch((e) => setError(errorMessage(e)));
  }, [name]);

  return (
    <>
      <div className="page-head">
        <h1>Your progress</h1>
        <p>Built from what you study and discuss, tracked under the name {name}.</p>
      </div>
      {error && <p className="alert">{error}</p>}
      {summary && (
        <>
          <div className="stats">
            <div className="stat"><b>{summary.explanationsViewed}</b>Explanations studied</div>
            <div className="stat"><b>{summary.messagesPosted}</b>Discussion messages</div>
          </div>
          <h2 className="eyebrow">Recent activity</h2>
          {summary.recent.length === 0 ? (
            <p className="empty">Nothing yet. <Link to="/">Look up a topic</Link> to get started.</p>
          ) : (
            <ul className="activity">
              {summary.recent.map((a, i) => (
                <li key={i}>
                  <span>{ACTIVITY_LABELS[a.type] ?? a.type} · <Link to={`/keys/${a.keyId}`}>open key</Link></span>
                  <time dateTime={a.occurredAt}>{new Date(a.occurredAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
