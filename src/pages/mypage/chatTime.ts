// 채팅 시각 표시 (회원 상담 화면 · 관리자 상담 화면 공통)
// - at : 서버가 보낸 시각 "2026-10-10T14:05:30" (MessageDto 의 createdAt) — new Date( ) 로 바로 읽을 수 있는 모양

// 'n분 전' 대신 간단히 : 오늘이면 '09:12' , 아니면 '10.07' (withDate 면 '10.07 09:12')
export function formatChatTime(at: string, withDate = false) {
  const date = new Date(at);
  const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday && !withDate) return time;
  const day = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  return withDate ? `${day} ${time}` : day;
}
