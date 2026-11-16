-- 我的學習紀錄：資料表＋門禁（RLS）
-- Supabase 左側 SQL Editor → 貼上整份 → Run。
-- 重跑時保留資料表，並重建這張表的 RLS 規則。

create table if not exists public.learning_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date   date not null default current_date,
  topic      text not null check (char_length(topic) between 1 and 200),
  minutes    integer check (minutes between 0 and 1440),
  note       text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.learning_logs enable row level security;

-- 避免舊政策仍然放行：重建這張表的全部政策。
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'learning_logs' loop
    execute format('drop policy %I on public.learning_logs', p.policyname);
  end loop;
end $$;

create policy "本人可以看自己的紀錄" on public.learning_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "本人只能新增自己的紀錄" on public.learning_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "本人只能修改自己的紀錄" on public.learning_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "本人只能刪自己的紀錄" on public.learning_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.learning_logs to authenticated;
revoke all on table public.learning_logs from anon;
