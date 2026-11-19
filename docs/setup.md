# 사용자가 할 일 (설정 순서)

서버는 pray-for의 Supabase다. 아래를 순서대로 한다.

1. **GitHub Pages·DNS**: 그대로다(저장소 Settings > Pages > Source `main`, 폴더 `/ (root)`, 가비아 `CNAME` 레코드 호스트 `admin` 값 `kwjgl.github.io.`, 반영되면 "Enforce HTTPS"). 저장소는 공개로 둔다. 사용자 지정 도메인은 `CNAME` 파일이 잡아 준다.
2. **036 넣기**: pray-for 저장소 `supabase/036_admin_ops.sql`을 Supabase 콘솔 SQL Editor에서 실행하고, 맨 끝 확인 줄이 모두 `true`인지 본다. 이 SQL이 없으면 오늘 화면이 "서버 SQL이 아직 없어요"를 보여 준다(그것도 정상 동작이다).
3. **Redirect URL 더하기**: Supabase 콘솔 > Authentication > URL Configuration > Redirect URLs에 `https://admin.koinobia.com/**`를 더한다(코이데가 `https://koide.koinobia.com/app/**`를 쓰는 것과 같은 방식). 카카오·구글·애플 개발자 콘솔에서 새로 할 일은 없다.
4. **로그인 확인**: `https://admin.koinobia.com/`에서 코이데에서 쓰던 방법으로 로그인한다. 오늘 화면이 뜨면 된다. 다 쓰면 로그아웃한다(공용 컴퓨터에서는 꼭).
5. **안 될 때** (증상 → 까닭)

| 증상 | 까닭과 할 일 |
|---|---|
| 로그인한 뒤 코이데 앱 화면으로 돌아간다 | 3번 Redirect URL이 빠졌다. 더한다 |
| "이 계정은 앱 관리자가 아니에요" | `app_admin`에 이 계정이 없거나, 코이데에서 쓰던 것과 다른 로그인 방법이다. 화면의 로그인 방법과 계정 번호를 확인한다(번호는 채팅·GitHub에 올리지 않는다) |
| "서버 SQL이 아직 없어요" | 2번 036을 아직 안 넣었다 |
| "로그인하지 못했어요" | 로그인을 취소했거나 로그인 제공자 쪽 문제다. 다시 해 본다 |

화면만 먼저 보려면 `?demo`, `?demo=out`, `?demo=notadmin`, `?demo=error`를 붙여 연다(서버 없이 가짜 응답).

내 컴퓨터에서 진짜 로그인을 시험하려면 3번처럼 `http://localhost:8123/**`를 잠깐 더했다가 끝나면 지운다.
