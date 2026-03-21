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
    return `서버에 연결할 수 없습니다. API 서버가 켜져 있는지 확인하고, 원격 접속이면 앱 설정의 API 주소(또는 빌드 시 EXPO_PUBLIC_API_URL)가 맞는지 확인해 주세요. (요청 주소: ${base})`;
  }
  return m || fallback;
}
