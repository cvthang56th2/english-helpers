# Word Ledger

Sổ từ vựng cá nhân: tra EN⇔VI, IPA + phát âm, lưu theo ngày.

**Stack:** Next.js · Neon (Postgres + Auth) · Drizzle · shadcn/ui

## Setup

1. Tạo [Neon project](https://console.neon.tech), copy **pooled** `DATABASE_URL`.
2. Bật **Auth** (Managed Better Auth): Project → Branch → Auth → Enable Auth.  
   Copy **Auth URL** → `NEON_AUTH_BASE_URL`.
3. Trusted domains: thêm `http://localhost:3000` (và domain production).
4. Google OAuth (optional): Neon Auth → OAuth → Google. Redirect URI phải là  
   `{NEON_AUTH_BASE_URL}/callback/google` (không phải URL app).
5. Magic link: bật plugin Magic Link trong Neon Auth (SMTP nếu production).
6. Tạo cookie secret:

```bash
openssl rand -base64 32
```

7. Env:

```bash
cp .env.example .env.local
# điền DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
```

8. Chạy SQL [`drizzle/001_words.sql`](drizzle/001_words.sql) trên Neon SQL Editor  
   (sau khi Auth đã tạo schema `neon_auth`).

```bash
pnpm install
pnpm dev
```

App mặc định `localhost:3000`. Dev hiện tại có thể dùng `pnpm dev --port 3001`.

## Chrome extension

Companion MV3: bôi từ trên mọi trang (icon + chuột phải), popup tra/lưu, side panel sổ, form thêm từ + IPA (cùng form trên web). Cần đang login Word Ledger trên cùng origin.

```bash
pnpm --dir extension install
pnpm ext:dev            # watch + unpacked dir
# hoặc: pnpm ext:build
```

Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → chọn `extension/.output/chrome-mv3-dev` (dev) hoặc `extension/.output/chrome-mv3` (sau `pnpm ext:build`).

Trusted domains Neon Auth phải gồm origin app. Cookie session trên origin đó được extension dùng để gọi `/api/words`.

## Dịch & từ điển

- Google Translate (unofficial `translate_a/single`): dịch + phiên âm + definitions
- Audio: Google Translate TTS (US / UK)
- Server lookup trước; nếu fail thì client gọi cùng endpoint

## Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm drizzle-kit push   # optional alternative to SQL file
pnpm ext:dev            # Chrome extension (WXT)
pnpm ext:build
```
