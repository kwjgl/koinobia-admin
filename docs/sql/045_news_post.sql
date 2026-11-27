-- 소식 글(블로그) 서버 (2026-11-27). 044 다음에 SQL Editor에 통째로 붙여 넣고 Run 한다(여러 번 돌려도 된다).
-- 왜: 대문 사이트(koinobia.com)의 소식을 news.js 파일을 고치지 않고, 운영자 사이트(admin.koinobia.com)에서 글을 쓰고 '올리기'만 눌러 바로 보이게 한다.
--   올라간 글은 고치고 내리고 지울 수 있다. 글은 마크다운(굵게·작은 제목·목록·인용·링크)이다. 이 파일은 서버만이다. 앱(app/) 화면은 바뀌지 않는다.
--   news.js에 이미 있는 글은 그대로 두고, 새로 쓴 글이 그 위에 합쳐져 보인다.
--
-- 순서: 036(admin_gate·admin_log_put)과 koide_today()가 먼저 있어야 한다.
-- 바꾸는 것: 새 표 1개(news_post), 새 함수 4개.
--   · 공개(누구나, 로그인 없이): news_public_list — 올라간 글만 준다. 대문 사이트가 부른다.
--   · 공개(앱 관리자만): admin_news_list(본문까지 함께 싣는다), admin_news_save(새 글·고치기·올리기·내리기), admin_news_delete.
-- 안 바꾸는 것: 001~044 파일, 앱 쪽 모든 표·함수.
--
-- 지킬 것: 이 글은 모두에게 공개되는 글이다(사람이 앱에 적은 기록 내용이 아니다). 사람 이름·교회 이름·기도제목을 옮겨 적지 않도록 화면에서 안내한다.
--   운영 기록(admin_log)에는 글 번호=상태만 적고 제목·본문은 적지 않는다. 오류는 'login'(28000)·'bad: …'만 쓴다.
--   미래 날짜로 올리면 그날부터 보인다(한국 날짜 koide_today 기준).

-- 0. 순서 확인
do $$
begin
  if to_regprocedure('public.admin_gate()') is null or to_regprocedure('public.admin_log_put(text,text)') is null
     or to_regprocedure('public.koide_today()') is null then
    raise exception '036_admin_ops.sql까지 먼저 실행해 주세요.';
  end if;
end $$;

-- 1. 새 표: 소식 글. 앱·사이트가 직접 읽고 쓰지 못한다(함수로만).
create table if not exists public.news_post (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 100),
  tag text not null default '' check (char_length(tag) <= 20),
  summary text not null default '' check (char_length(summary) <= 200),
  body text not null check (char_length(body) between 1 and 20000),
  post_date date not null,
  status text not null default '임시' check (status in ('임시', '올림')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.news_post enable row level security;
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('news_post')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
revoke all on public.news_post from public, anon, authenticated;

-- 2. 공개(누구나): 올라간 글. 상태가 '올림'이고 날짜가 오늘(한국)까지인 글만, 날짜가 최근인 것부터 100개. 임시 글은 주지 않는다.
create or replace function public.news_public_list() returns jsonb language sql stable security definer
set search_path = '' as $$
  select pg_catalog.jsonb_build_object('items', coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', t.id, 'title', t.title, 'tag', t.tag, 'summary', t.summary, 'body', t.body, 'date', t.post_date) order by t.post_date desc, t.id desc), '[]'::jsonb))
    from (select p.id, p.title, p.tag, p.summary, p.body, p.post_date from public.news_post p
          where p.status = '올림' and p.post_date <= public.koide_today()
          order by p.post_date desc, p.id desc limit 100) t
$$;

-- 3. 공개(앱 관리자만): 모든 글(임시 포함, 본문까지). 날짜가 최근인 것부터 200개.
create or replace function public.admin_news_list() returns jsonb language plpgsql security definer
set search_path = '' as $$
begin
  perform public.admin_gate();
  return pg_catalog.jsonb_build_object('items', (
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', t.id, 'title', t.title, 'tag', t.tag, 'summary', t.summary, 'body', t.body, 'date', t.post_date, 'status', t.status,
        'live', (t.status = '올림' and t.post_date <= public.koide_today()), 'created_at', t.created_at, 'updated_at', t.updated_at)
      order by t.post_date desc, t.id desc), '[]'::jsonb)
    from (select * from public.news_post p order by p.post_date desc, p.id desc limit 200) t));
end $$;

-- 4. 공개(앱 관리자만): 글 저장. p_id가 null이면 새 글, 있으면 고치기. p_status는 '임시' 또는 '올림'(올리기). p_date가 null이면 오늘(한국).
--   제목 1~100자, 꼬리표 20자 이하(빈 글 가능), 요약 200자 이하(빈 글이면 사이트가 본문 첫 문단으로 만든다), 본문 1~20000자. 줄바꿈은 \n으로 맞춘다.
--   돌려주는 값: 글 목록({items})에 방금 저장한 글 번호(saved)를 더한다. 운영 기록에는 번호=상태만 적는다(제목·본문 금지).
create or replace function public.admin_news_save(p_id bigint, p_title text, p_tag text, p_summary text, p_body text, p_date date, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ti text := pg_catalog.btrim(coalesce(p_title, '')); tg text := pg_catalog.btrim(coalesce(p_tag, ''));
        su text := pg_catalog.btrim(coalesce(p_summary, '')); bo text := pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(coalesce(p_body, ''), E'\r\n', E'\n'), E'\r', E'\n'), E' \n\t');
        dt date := coalesce(p_date, public.koide_today()); sid bigint;
begin
  perform public.admin_gate();
  if p_status is null or p_status not in ('임시', '올림') then raise exception 'bad: 상태는 임시 또는 올림이에요.'; end if;
  if pg_catalog.char_length(ti) not between 1 and 100 then raise exception 'bad: 제목은 1~100글자로 써 주세요.'; end if;
  if pg_catalog.char_length(tg) > 20 then raise exception 'bad: 꼬리표는 20글자 이하로 써 주세요.'; end if;
  if pg_catalog.char_length(su) > 200 then raise exception 'bad: 요약은 200글자 이하로 써 주세요.'; end if;
  if pg_catalog.char_length(bo) not between 1 and 20000 then raise exception 'bad: 본문은 1~20000글자로 써 주세요.'; end if;
  if dt < date '2020-01-01' or dt > public.koide_today() + 3650 then raise exception 'bad: 날짜를 다시 확인해 주세요.'; end if;
  if p_id is null then
    insert into public.news_post(title, tag, summary, body, post_date, status) values (ti, tg, su, bo, dt, p_status) returning id into sid;
  else
    update public.news_post set title = ti, tag = tg, summary = su, body = bo, post_date = dt, status = p_status, updated_at = now() where id = p_id returning id into sid;
    if sid is null then raise exception 'bad: 글을 찾지 못했어요.'; end if;
  end if;
  perform public.admin_log_put('news-save', sid::text || '=' || p_status);
  return public.admin_news_list() || pg_catalog.jsonb_build_object('saved', sid);
end $$;

-- 5. 공개(앱 관리자만): 글 지우기. 되돌릴 수 없다(내리기만 하려면 admin_news_save로 '임시'로 바꾼다).
create or replace function public.admin_news_delete(p_id bigint) returns jsonb language plpgsql security definer
set search_path = '' as $$
begin
  perform public.admin_gate();
  delete from public.news_post where id = p_id;
  if not found then raise exception 'bad: 글을 찾지 못했어요.'; end if;
  perform public.admin_log_put('news-delete', p_id::text);
  return public.admin_news_list();
end $$;

-- 6. 권한: 공개 읽기(news_public_list)는 누구나, 나머지 셋은 로그인한 사람만 실행하고 첫 줄에서 앱 관리자를 확인한다.
revoke all on function public.news_public_list(), public.admin_news_list(), public.admin_news_save(bigint, text, text, text, text, date, text),
  public.admin_news_delete(bigint) from public, anon, authenticated;
grant execute on function public.news_public_list() to anon, authenticated;
grant execute on function public.admin_news_list(), public.admin_news_save(bigint, text, text, text, text, date, text), public.admin_news_delete(bigint) to authenticated;

-- 확인: 순서대로 true, true, true, true를 기대한다.
-- (공개 읽기를 누구나 실행할 수 있음, 관리자 함수 셋을 로그인한 사람만 실행하고 익명은 못 함, news_post RLS 켜짐, anon·authenticated의 직접 권한 없음)
select (select bool_and(has_function_privilege('anon', 'public.news_public_list()', 'execute') and has_function_privilege('authenticated', 'public.news_public_list()', 'execute'))) as public_read_ok,
       (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute')) from unnest(array[
          'public.admin_news_list()', 'public.admin_news_save(bigint, text, text, text, text, date, text)', 'public.admin_news_delete(bigint)']) as f) as admin_fns_ok,
       (select c.relrowsecurity from pg_class c where c.oid = 'public.news_post'::regclass) as news_rls_on,
       not (has_table_privilege('anon', 'public.news_post', 'select, insert, update, delete') or has_table_privilege('authenticated', 'public.news_post', 'select, insert, update, delete')) as news_no_direct;
