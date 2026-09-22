import { LoginCard, LookupBox, ManualForm, useSession } from "../../lib/ui";
import { sendMessage } from "../../lib/messages";

async function openSidePanel() {
  const win = await browser.windows.getCurrent();
  if (win.id != null) {
    await browser.sidePanel.open({ windowId: win.id });
  }
}

export function App() {
  const { user, error } = useSession();

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <p className="brand">Word Ledger</p>
          <h1>Tra nhanh</h1>
        </div>
        {user?.email && <span className="muted">{user.email}</span>}
      </header>

      {user === undefined ? (
        <p className="muted">Đang kiểm tra phiên…</p>
      ) : user === null ? (
        <LoginCard message={error ?? undefined} />
      ) : (
        <>
          <LookupBox />
          <ManualForm />
        </>
      )}

      <div className="row">
        <button
          className="btn secondary"
          type="button"
          onClick={() => void openSidePanel()}
        >
          Mở sổ
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
