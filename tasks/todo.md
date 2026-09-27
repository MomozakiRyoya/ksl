# FSL 開発タスク

チェックボックスは手を動かす作業だけに使う。待ち・判断待ちは箇条書きで書く。

## 2026-09-27 アバターの削除と、プロフィール保存で選手写真が消える不具合
- [x] `src/lib/avatar-storage.ts` を新設（本人フォルダの一覧から消す。消す画像を指す選手写真は先に null へ戻す）
- [x] `DELETE /api/account/avatar` を追加（`getUser()` で確認した本人の `avatars/<user.id>/` だけを消す）
- [x] `/api/account/sync-photo` は本人フォルダの画像 URL だけを受け付け（null は 400）、反映後に差し替え前の画像を消す
- [x] `AccountClient` の削除を API 経由にし、保存ではアバターと選手写真に触らない。失敗は画面に出す
- [x] `tsc --noEmit` と `next build` を通す
- [x] `master` にコミット（push はユーザーへ手渡し）

## 2026-09-27 一般ユーザーのアバター画像アップロード
- [x] `/api/account/avatar` を新設（`getUser()` で本人確認 → サービスロールで `avatars/<user.id>/` へ保存）
- [x] `AccountClient` のアップロードをこの API 経由にし、失敗時はエラー内容を画面に出す
- [x] バケット作成 SQL と画像規則のコメントを実態に合わせる
- [x] `/api/account/sync-photo` が本人の選手（`user_email` 一致）にだけ書くようにする（`user_metadata.player_id` は本人が自由に変えられる）
- [x] `tsc --noEmit` と `next build` を通す
- [x] `master` にコミット（push はユーザーへ手渡し）

## Phase 1 - MVP基盤
- [x] プロジェクト初期化
- [x] Notionクライアント・クエリ実装
- [x] ページルーティング設定
- [x] BottomNav実装
- [x] 環境変数設定（Vercel で管理）
- [x] Vercelデプロイ（本番 kagoshimasuperleague.com。master への push で出る）
- Notionワークスペース・DB作成 → 不要。データは Supabase に移した（`src/lib/notion/` と、それを使う `RecentResults` / `NextMatchCard` はどこからも読まれていない）

## Phase 2 - コアページ実装（2026-09-27 本番で全ページ 200 を確認）
- [x] ホームページ（完全版）
- [x] 順位表ページ
- [x] 日程ページ
- [x] チームページ・詳細
- [x] ルール・情報ページ

## Phase 3 - PWA（判断待ち: KSL でやるかが決まっていない）
FSL からフォークしたときに写してきた計画。着手するならユーザーの判断が先。
- Service Worker: 未実装（`public/` に無く、どこでも登録していない）
- ホーム画面追加バナー: `InstallBanner.tsx` はあるが、どの画面にも置かれていない
- プッシュ通知: サーバー側（`/api/push/*`）だけあり、ブラウザ側の購読処理が無い

## レビュー
- Phase 1 スキャフォールド完了: 2026-03-28
