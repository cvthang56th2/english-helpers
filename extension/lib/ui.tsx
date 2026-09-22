import { useEffect, useState, type FormEvent } from "react";
import type { Direction, LookupResult, WordRecord } from "../../lib/lookup/types";
import { sendMessage, type AuthedUser } from "./messages";

export function useSession() {
  const [user, setUser] = useState<AuthedUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await sendMessage({ type: "GET_SESSION" });
    if (!res.ok) {
      setError(res.error);
      setUser(null);
      return;
    }
    setError(null);
    setUser("user" in res ? res.user : null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { user, error, refresh };
}

export function LoginCard({ message }: { message?: string }) {
  return (
    <div className="card">
      <p className="muted">{message || "Đăng nhập trên web để lưu vào sổ Neon."}</p>
      <div className="row" style={{ marginTop: 10 }}>
        <button
          className="btn"
          type="button"
          onClick={() => void sendMessage({ type: "OPEN_LOGIN" })}
        >
          Đăng nhập
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => void sendMessage({ type: "OPEN_APP" })}
        >
          Mở web
        </button>
      </div>
    </div>
  );
}

export function LookupBox({
  onSaved,
}: {
  onSaved?: (word: WordRecord) => void;
}) {
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [saved, setSaved] = useState(false);

  async function lookup(e?: FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await sendMessage({ type: "LOOKUP", q: term, direction });
    setLoading(false);
    if (!res.ok || !("result" in res)) {
      setResult(null);
      setError(res.ok ? "Không tra được từ" : res.error);
      return;
    }
    setResult(res.result);
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    const res = await sendMessage({ type: "SAVE_LOOKUP", result });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    if ("word" in res && res.word) onSaved?.(res.word);
  }

  return (
    <form onSubmit={lookup} className="card" style={{ display: "grid", gap: 8 }}>
      <div className="row">
        <strong>{direction === "en-vi" ? "EN → VI" : "VI → EN"}</strong>
        <button
          type="button"
          className="btn secondary"
          style={{ height: 30, marginLeft: "auto" }}
          onClick={() => setDirection((d) => (d === "en-vi" ? "vi-en" : "en-vi"))}
        >
          Đổi hướng
        </button>
      </div>
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gõ một từ để tra…"
        autoFocus
      />
      <button className="btn" type="submit" disabled={!q.trim() || loading}>
        {loading ? "Đang tra…" : "Tra"}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <div>
          <p className="term">{result.term}</p>
          {result.ipa ? (
            <p className="ipa">/{result.ipa.replace(/^\/|\/$/g, "")}/</p>
          ) : (
            <p className="muted">Chưa có IPA</p>
          )}
          <p>{result.translation}</p>
          <button
            className="btn"
            type="button"
            style={{ marginTop: 8, width: "100%" }}
            onClick={() => void save()}
            disabled={saving || saved}
          >
            {saved ? "Đã lưu" : saving ? "Đang lưu…" : "Lưu vào sổ"}
          </button>
        </div>
      )}
    </form>
  );
}

export function ManualForm({
  onSaved,
}: {
  onSaved?: (word: WordRecord) => void;
}) {
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [ipa, setIpa] = useState("");
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendMessage({
      type: "SAVE_MANUAL",
      draft: { term, translation, ipa, direction },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if ("word" in res && res.word) onSaved?.(res.word);
    setTerm("");
    setTranslation("");
    setIpa("");
  }

  return (
    <details>
      <summary>Thêm từ + IPA thủ công</summary>
      <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <div className="row">
          <span className="muted">
            {direction === "en-vi" ? "EN → VI" : "VI → EN"}
          </span>
          <button
            type="button"
            className="btn secondary"
            style={{ height: 28, marginLeft: "auto" }}
            onClick={() => setDirection((d) => (d === "en-vi" ? "vi-en" : "en-vi"))}
          >
            Đổi
          </button>
        </div>
        <label>
          Từ
          <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <label>
          Nghĩa
          <input
            className="input"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
          />
        </label>
        <label>
          IPA
          <input
            className="input"
            value={ipa}
            onChange={(e) => setIpa(e.target.value)}
            placeholder="/kæt/"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu vào sổ"}
        </button>
      </form>
    </details>
  );
}
