# Clean Master 통합 홈페이지 · 감성 영상 메인 (Preview)

## 영상과 이용조건
- 선정 영상: **Bright, elegant living room with stylish furniture and natural sunlight**, Pexels video #5744421, 제작자 **Abdullah | 4K**.
- 출처: https://www.pexels.com/video/video-of-a-living-room-5744421/
- Pexels 라이선스: https://www.pexels.com/license/ (홈페이지 홍보 포함 상업적 사용 허용, 편집 허용, 출처표시 의무 없음).
- 실제 Clean Master 청소 공간이나 직원·실적으로 오인되지 않도록 화면에 **홍보용 예시 영상 · Pexels / Abdullah | 4K** 표시.
- 다운로드 출처 리다이렉트에서 확인된 공식 MP4: `https://videos.pexels.com/video-files/5744421/5744421-uhd_3840_2160_30fps.mp4` (4K, 11초, 16:9). 사용자 기기/네트워크에서 CDN 접근 및 재생 가능 여부는 별도 실접속 확인 전임.
- 포스터: 해당 영상의 Pexels 썸네일. 영상 미재생 시 정지 이미지로 자동 대체.

## 구현·성능
- `preview/integrated-v1/index.html` 메인 영역을 풀가로 감성 영상 히어로로 변경.
- 문구 **깨끗한 공간, 더 여유로운 일상.** + 방문 청소 예약·정기 홈케어 버튼.
- 901px 이상 PC에서만, 움직임 최소화 설정이 꺼져 있고 데이터 절약 설정이 아닌 경우 영상 로드를 시작. 처음 뷰포트에 진입하면 지연 로드. 무음·반복재생·인라인 재생, 일시정지/재생 버튼.
- 모바일, 저전력/데이터 절약 설정, 움직임 최소화 환경에서는 포스터 이미지 우선. CDN 차단/영상 오류 시 배경 이미지 유지.
- 클립은 원격 CDN에서 재생되므로 최초 PC 재생 시 4K 트래픽이 발생할 수 있음. 운영 전 720p/1080p WebM/MP4 자체 호스팅 및 용량 제한 검토 권장. 현재 Preview는 지연로딩·모바일 재생 차단으로 부담을 줄임.
- CSP 외부 허용은 `images.pexels.com`(이미지), `videos.pexels.com`(영상)만 추가. `connect-src 'none'` 유지, API/Supabase/Toss 요청 여전히 차단.

## 안전한 변경 범위
- GitHub: `nurioni4188/clean-master-homecare`의 `feature/integrated-rc13-preview-20261028` Draft PR #1 전용.
- 기존 Production 사이트 `main`, 기존 CRM 관리자·상담 API, 실제 DB·결제 미변경.
- 별도 `clean-master-integrated-preview` Vercel 프로젝트에 정적 2파일만 배포. URL 새로 발급 및 READY 검증은 별도.
- 특수청소 영상은 별도 서비스 소개 섹션에서 향후 실제 제공 가능한 범위에 맞춰 추가.
