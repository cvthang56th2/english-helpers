# Word Ledger Chrome Extension

**Date:** 2026-09-22  
**Approach:** Companion extension in-repo; reuse Word Ledger APIs and Neon session.

## Goal

Chromium (Manifest V3) extension that looks up EN⇔VI on any page, saves to the same Neon notebook as the web app, and lets the user manually add a word + IPA (also on the website).

## Product

- **Selection:** floating icon next to highlighted text; click looks up. Also right-click → “Tra Word Ledger”.
- **Toolbar popup:** lookup, save, manual add, login CTA, open side panel / open web app.
- **Side panel:** notebook grouped by day + search + manual add.
- **Web app:** same “Thêm thủ công” form (term, translation, IPA, direction; optional POS/definition).
- **Auth:** same Neon cookie session. Unauthenticated API returns JSON 401 (no HTML redirect). Login opens the web app.

## Architecture

```
content script (shadow UI) ─┐
popup / side panel ─────────┼─► runtime message ► background SW ► fetch APP_URL/api/*
context menu ───────────────┘
```

- Folder: `extension/` (WXT + React for popup/side panel; shadow DOM for overlay).
- APIs: `POST /api/lookup` (public), `GET|POST /api/words` (session), `GET /api/auth/get-session`.
- `APP_URL` from `WXT_APP_URL` (default `http://localhost:3001`).
- Shared helpers in `lib/words/manual.ts` (validate, IPA normalize, selection → query).

## Out of scope (v1)

Firefox/Safari, scraping Google, offline lookup, sync tokens beyond cookies.
