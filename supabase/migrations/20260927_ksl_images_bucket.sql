-- 画像（チームロゴ・選手写真・注目選手・一般ユーザーのアバター）の保存先バケット。
-- コードは ksl-images を参照しているが、どのマイグレーションでも作られておらず、
-- 本番に存在しなかった（アップロードが "Bucket not found" で全件失敗していた）。
-- 書き込みは /api/admin/upload（管理者）と /api/account/avatar（本人の avatars/<user.id>/ のみ）が
-- サービスロールで行うため、storage.objects のポリシーは足さない。
insert into storage.buckets (id, name, public)
values ('ksl-images', 'ksl-images', true)
on conflict (id) do update set public = true;
