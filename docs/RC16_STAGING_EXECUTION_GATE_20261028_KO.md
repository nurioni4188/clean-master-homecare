# Clean Master RC16 · 디자인 고정 Staging 실행 게이트 (2026-10-28)

## 안전 기준
- 최종 디자인 원본: `preview/integrated-v1/index.html` / Git Blob `0e405d7646efd502b20606a1a8c251524c30070f`.
- 변경/배포 금지: 기존 `clean-master-homecare` Production, `clean-master-integrated-preview` 원본 URL, `main`, 로컬 v2.6.
- 신규 파생 소스: `preview/integrated-v26-staging/`. 기존 RAM 시연 기능과 실DB 업무흐름을 동일한 버튼에서 혼용하지 않는다.
- 개발 브랜치 `feature/integrated-v26-designlocked-staging-20261028`, Draft PR #4.

## 실제 확인
- GitHub Actions: original blob lock, CSS/서비스/요금/문의 마케팅 섹션 동일성, Staging UI 격리 및 JS 구문 검증 PASS.
- Supabase `clean-master-ops-staging`: `ACTIVE_HEALTHY`, 공개 스키마 24테이블 RLS 활성화 이력.
- 별도 조회 2026-10-28: organizations=1, memberships=0, customers=0, service_catalog=0, cm_subscription_plans=0, bookings=0. 실제 계정 JWT·RLS E2E 시험은 불가.
- 신규 Vercel 프로젝트 `clean-master-integrated-v26-staging` 생성 시도: **403 Forbidden (POST /v11/projects)**. 생성 **실패**. 기존 사이트에 우회 배포하지 않음.

## Vercel 권한 복구 후
1. 팀 `onnuri4188gmailcoms-projects`의 연결된 Vercel 계정에 **프로젝트 생성 권한**이 있는지 확인. 새 프로젝트 생성 불가시 관리자가 권한을 부여하거나 연결을 수정.
2. 신규 독립 프로젝트 이름 `clean-master-integrated-v26-staging`, 소스 GitHub `nurioni4188/clean-master-homecare`, Root Directory `preview/integrated-v26-staging`, 빌드 Vite, SSO Protection **all**, 배포 대상 **Preview**만.
3. `package-lock.json`을 새 소스 폴더에 생성/검토 후 커밋. 의존성 설치/빌드 PASS 이전 자동 배포 금지.
4. Preview 환경변수에 `VITE_CM_ENV_LABEL=CLEAN_MASTER_STAGING`, `VITE_CM_STAGING_URL` (전용 Supabase URL), `VITE_CM_STAGING_PUBLISHABLE_KEY` (공개용 키), `VITE_CM_SYNTHETIC_WRITES=OFF`. 서버 secret/service_role 절대 금지.
5. 새 URL을 Supabase Auth URL Configuration redirect allowlist에 추가 후 **승인된 합성 TEST 계정**만 생성/초대. 실제 이메일/개인정보 없이 무작위 시험용 계정 권장.
6. 조직 A/B, 고객 A/B, 청소 담당자 A/B, 관리자 A/B 멤버십과 합성 서비스/가격확정 테스트 전용 요금제 생성 (실판매 활성화 및 PG 연동 금지).
7. 로그인을 실제로 수행하여 고객A 예약 생성 → 관리자 A 확정/명시적 배정 → 고객A 마이페이지 갱신 → 구독 결제대기 신청·취소 → 다른 고객/조직 접근 차단 확인.
8. 원본 2번과 신규 Preview의 PC(1440px) / Tablet(768px) / 모바일(390px) 시각 비교와 영상 일시정지·메뉴·폼·반응형 검증. 실제 동작 화면을 확인하기 전 디자인 시각 PASS 금지.
9. JWT/RLS E2E, 실제 DB 보존/재접속, Backup/Restore, 보안 advisor 검토 완료 후에도 PG TEST/결제/개인정보/Production은 별도 검토·승인 필요.

## 현재 판정
**DESIGN SOURCE / STATIC CI PASS. PROTECTED VERCEL PREVIEW HOLD (403). REAL JWT E2E HOLD (no users). PRODUCTION HOLD.**
