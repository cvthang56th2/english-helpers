import { useEffect, useMemo, useState } from "react";
import type { WordRecord } from "../../../lib/lookup/types";
import { LoginCard, LookupBox, ManualForm, useSession } from "../../lib/ui";
import { sendMessage } from "../../lib/messages";

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
}

export function App() {
  const { user, error } = useSession();
  const [query, setQuery] = useState("");
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function load(q = query) {
    setLoading(true);
    const res = await sendMessage({ type: "LIST_WORDS", q });
    setLoading(false);
    if (!res.ok || !("words" in res)) {
      setListError(res.ok ? "Không tải được sổ" : res.error);
      return;
    }
    setListError(null);
    setWords(res.words);
  }

  useEffect(() => {
    if (!user) return;
    const t = window.setTimeout(() => void load(query), query ? 280 : 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, query]);

  const groups = useMemo(() => {
    const map = new Map<string, WordRecord[]>();
    for (const word of words) {
      const key = dayKey(word.created_at);
      const list = map.get(key) ?? [];
      list.push(word);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [words]);

  function onSaved(word: WordRecord) {
    setWords((prev) => [word, ...prev.filter((w) => w.id !== word.id)]);
  }

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <p className="brand">Word Ledger</p>
          <h1>Sổ từ vựng</h1>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() => void sendMessage({ type: "OPEN_APP" })}
        >
          Web
        </button>
      </header>

      {user === undefined ? (
        <p className="muted">Đang kiểm tra phiên…</p>
      ) : user === null ? (
        <LoginCard message={error ?? undefined} />
      ) : (
        <>
          <LookupBox onSaved={onSaved} />
          <ManualForm onSaved={onSaved} />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong sổ…"
          />
          {loading && <p className="muted">Đang tải sổ…</p>}
          {listError && <p className="error">{listError}</p>}
          <div className="list">
            {groups.length === 0 && !loading ? (
              <p className="muted">Sổ còn trống — tra hoặc thêm thủ công.</p>
            ) : (
              groups.map(([key, list]) => (
                <section key={key}>
                  <p className="day">
                    {dayLabel(list[0].created_at)} · {list.length}
                  </p>
                  <div className="card">
                    {list.map((word) => (
                      <div className="word" key={word.id}>
                        <span className="term">{word.term}</span>
                        {word.ipa && (
                          <span className="ipa"> /{word.ipa.replace(/^\/|\/$/g, "")}/</span>
                        )}
                        <div>{word.translation}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
