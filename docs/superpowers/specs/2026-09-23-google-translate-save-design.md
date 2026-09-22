# Google Translate quick-save (extension)

**Date:** 2026-09-23  
**Approach:** Dedicated content script on Google Translate; reuse `SAVE_MANUAL` / `LOOKUP`.

## Goal

On `translate.google.*`, one click near the result opens a confirm card (term, translation, IPA, direction), then saves to Word Ledger. Long English phrases without IPA can split words to fetch and join IPA into the same entry. Toast confirms save / duplicate / login.

## Product

- Button **Lưu vào sổ** below/near the translation result.
- Confirm card → edit → save; toast feedback.
- **Tách từ lấy IPA** when EN→VI, ≥2 English tokens, empty IPA; selected words looked up; IPA joined into one field; still one notebook entry.

## Architecture

- `extension/entrypoints/google-translate.content.ts`
- `extension/lib/google-translate/read-pair.ts` (DOM + tokenize helpers)
- General `content.ts` excludes Google Translate hosts.
- No new HTTP APIs.

## Out of scope

Firefox/Safari; non EN↔VI pairs as first-class; auto-save without confirm.
