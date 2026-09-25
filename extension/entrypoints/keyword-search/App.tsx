import { useEffect, useRef, useState, type FormEvent } from "react";
import { englishMeaningQuery } from "../../lib/google-search/keyword-search";
import { sendMessage } from "../../lib/messages";

export function App() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = englishMeaningQuery(q);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!preview || pending) return;
    setPending(true);
    setError(null);
    const res = await sendMessage({ type: "SEARCH_ENGLISH_MEANING", keyword: q });
    if (!res.ok) {
      setPending(false);
      setError(res.error);
      return;
    }
    window.close();
  }

  return (
    <form className="wrap" onSubmit={(e) => void submit(e)}>
      <header>
        <p className="brand">Word Ledger</p>
        <h1>Tìm tiếng Anh</h1>
      </header>
      <label>
        Từ khóa
        <input
          ref={inputRef}
          className="input"
          value={q}
          placeholder="ví dụ: bò kho"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <p className="muted">{preview ? `Google: “${preview}”` : "Nhập từ để tìm trên Google"}</p>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn" type="submit" disabled={!preview || pending}>
        {pending ? "Đang mở…" : "Tìm"}
      </button>
    </form>
  );
}
