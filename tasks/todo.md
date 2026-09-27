# FSL 開発タスク

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
- [ ] Notionワークスペース・DB作成
- [ ] 環境変数設定
- [ ] Vercelデプロイ

## Phase 2 - コアページ実装
- [ ] ホームページ（完全版）
- [ ] 順位表ページ
- [ ] 日程ページ
- [ ] チームページ・詳細
- [ ] ルール・情報ページ

## Phase 3 - PWA
- [ ] Service Worker実装
- [ ] ホーム画面追加バナー
- [ ] プッシュ通知

## レビュー
- Phase 1 スキャフォールド完了: 2026-03-28
