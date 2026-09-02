# 에너지 크로니클 — 빛을 되찾는 열 개의 사당

중2 기술·가정 6단원(친환경 에너지 자원) 1~4차시 학습용 3D RPG.
빌드 도구 없이 그냥 정적 파일입니다. **Vercel에 이 폴더째 올리면 바로 배포됩니다.**

## Vercel 배포
```bash
npm i -g vercel   # 최초 1회
vercel            # 이 폴더에서 실행 → 미리보기 주소
vercel --prod     # 실서비스 주소
```
또는 GitHub에 올리고 Vercel에서 Import → **Framework Preset: Other**,
Build Command·Output Directory는 **비워 두면 됩니다.** (빌드 과정이 없습니다)

로컬에서는 `index.html`을 그냥 더블클릭해도 동작합니다.

## 파일 구조
```
index.html          화면 구조(HUD·대화창·사당창·터치 버튼)
css/
  theme.css         ★ 색·글꼴 토큰. UI 톤 변경은 여기 :root 변수만
  ui.css            HUD·대화·사당·터치 컨트롤 스타일
js/
  vendor/three.min.js   3D 엔진 (r128, MIT)
  config.js         사당 10곳·NPC·문제 데이터, 지형 높이 함수, 기기/품질 판별
  art.js            ★ 3D 아트 디렉션. 팔레트·재질·캐릭터/나무/몬스터 형태
  world.js          렌더러·조명·지형·바다·초목·빛의 도시
  actors.js         사당 구조물, 플레이어, NPC, 에너지 파편
  monsters.js       오염 지대·오염 몬스터·정화의 빛
  game.js           상태·HUD·입력·카메라·메인 루프
  shrine.js         사당 시련 프레임워크, 확인 문제, 엔딩
  puzzles.js        사당별 미니 시뮬레이션 10종
```
`<script>`는 `index.html` 아래쪽에 **순서대로** 들어 있습니다.
번들러가 없으므로 파일을 새로 추가하면 그 목록에도 넣어 주세요.

## 디자인을 고칠 때
- **UI 색·글꼴** → `css/theme.css`의 `:root` 변수
- **3D 색 팔레트** → `js/art.js` 맨 위 `ART` 객체 (하늘·조명·지형·초목·물·도시·캐릭터)
- **캐릭터 형태** → `art.js`의 `makeHumanoid()`
- **나무·바위** → `art.js`의 `treeInstance()`, `TREE_GEO`, `ROCK_GEO`
- **몬스터 형태** → `art.js`의 `makeMonsterBody()`
- **집·광장·전력탑** → `world.js`의 `buildCity()`

색 하나만 바꿔도 전체 톤이 따라오도록 리터럴을 `ART`로 모아 두었습니다.

## 수업 관련
차시별 활용법, 사당 10곳의 학습 내용, 몬스터 밀도 조절은 `수업안내.md` 참고.

## 성능 메모
- 나무·바위·풀·꽃은 `InstancedMesh`로 묶어 드로우콜을 100 안팎으로 유지합니다.
- 포인트 라이트는 6개 이하로 제한합니다(사당 조명은 가장 가까운 한 곳만).
- 프레임이 낮으면 해상도 → 그림자 순으로 **조용히** 품질을 낮춥니다(안내 문구 없음).
