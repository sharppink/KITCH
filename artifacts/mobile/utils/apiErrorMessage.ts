import { getApiBaseUrl } from '@/constants/apiBase';

/** 브라우저·RN에서 fetch 실패 시 공통으로 나오는 메시지를 사용자 친화 문구로 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const m = err instanceof Error ? err.message : String(err);
  if (
    m === 'Failed to fetch' ||
    m === 'Load failed' ||
    m.includes('Network request failed')
  ) {
    const base = getApiBaseUrl();
    // Vercel Deployment Protection(401 HTML, CORS 없음) → 브라우저는 네트워크 실패처럼 보고함
    const vercelProtectionHint = /vercel\.app/i.test(base)
      ? ' (Vercel api-server 프로젝트의 Deployment Protection이 프로덕션까지 켜져 있으면 401+CORS로 같은 증상이 납니다. Vercel 대시보드 → 해당 프로젝트 → Settings → Deployment Protection 을 확인하세요.)'
      : '';
    return `서버에 연결할 수 없습니다. API 서버가 켜져 있는지 확인하고, 원격 접속이면 앱 설정의 API 주소(또는 빌드 시 EXPO_PUBLIC_API_URL)가 맞는지 확인해 주세요. (요청 주소: ${base})${vercelProtectionHint}`;
  }
  return m || fallback;
}
