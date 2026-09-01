Plan:
1. `supabase/schema.sql` (RLS DELETE on posts for admin, UPDATE/DELETE for comments/messages, bucket policies).
2. Fix `app/feed/page.tsx`:
   - Supabase query `lt('flags', 4)` and local mock filter for `flags < 4`.
   - Track flags in local storage / or prevent unlimited flags per user. Since we don't have a `post_flags` table (only `flags` column), I can just track `flaggedPosts` in a state/local array for mock, or create a `post_flags` table? Wait, `likes` exists but not `post_flags`. Since I can modify `schema.sql`, I will create a `post_flags` table to handle duplicates safely in prod. Wait, there's `Filtro de posts con flags > 3 ocultos`. And `handleFlag permite flags ilimitados por el mismo usuario`.
3. Fix `app/admin/page.tsx`:
   - Validar rol real (no basta `true` en el mock sin comprobar `isAdmin`).
4. Fix `app/api/webhook/route.ts`:
   - Remove fallback to anonymous client. Check idempotency (or mention idempotency if already tracked).
5. Fix `app/api/checkout/route.ts`:
   - Remove hardcoded `sk_test_12345`.
   - Validate `STRIPE_MONTHLY_PRICE_ID`.
6. Fix `messages.encrypted_content`:
   - Update comment/name or actually encrypt. The instruction says `columna ... almacena texto plano ... contradice el nombre`.
7. `app/page.tsx`: registration without real email. Use fake email generator or `signInAnonymously`.
8. Fix mock mode search in `feed/page.tsx`: include `tag`.
9. Add debounce to search input in `feed/page.tsx`.
10. Fix search page reset (move to useEffect or handle in debounced function).
11. Remove `isomorphic-dompurify` from `package.json` (or `xss`).
12. Fix fallback to `MOCK_AUDIO_URL` when no file in `CreatePost.tsx`.
13. Delete `server.log`.
14. Fix `as any` in typing (change to `as "document" | "audio"`).
