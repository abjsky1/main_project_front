// ⚠️ 고객센터 채팅 — 프론트 데모 (브라우저 localStorage 에 저장)
//    같은 브라우저에서 회원 ↔ 관리자 계정을 바꿔 가며 대화가 이어지는 것을 시연할 수 있음
//    (다른 컴퓨터끼리는 공유되지 않음 — 백엔드 채팅 API 가 생기면 useSupportChat.ts 안을 axios 호출로 바꾸면 됨)

export type ChatSender = 'member' | 'admin';   // 보낸 사람 (회원 / 고객센터)

export interface ChatMessage {
  id: string;
  from: ChatSender;
  text: string;
  at: string;          // 보낸 시각 (ISO 글자 , 예: '2026-10-08T09:12:00.000Z')
}

// 채팅방 1개 = 회원 1명
export interface ChatRoom {
  memberId: string;
  memberName: string;
  companyName: string;
  companyType: string;   // '수출입기업' | '물류업체'
  messages: ChatMessage[];
  adminReadAt: string;   // 관리자가 마지막으로 읽은 시각 → 이후에 회원이 보낸 메시지 = 안 읽음
  memberReadAt: string;  // 회원이 마지막으로 읽은 시각
}

export const STORAGE_KEY = 'macross:support-chat:v1';

// 채팅방을 처음 열 때 고객센터가 자동으로 보내는 인사
export const WELCOME_TEXT = '안녕하세요, MACROSS 고객센터입니다. 무엇을 도와드릴까요?';

// 메시지 번호 만들기 (시각 + 임의 글자 → 겹치지 않게)
export function newMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// 'n분 전' 대신 간단히 : 오늘이면 '09:12' , 아니면 '10.07'
export function formatChatTime(at: string, withDate = false) {
  const date = new Date(at);
  const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday && !withDate) return time;
  const day = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  return withDate ? `${day} ${time}` : day;
}

/* ---------- 처음 데모 데이터 (관리자 화면에 채팅방이 보이도록) ---------- */

// 지금 시각에서 minutes 분 전의 ISO 글자
function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function demoRooms(): ChatRoom[] {
  return [
    {
      memberId: '67e5da21-5ed6-4ab4-8a94-9f26ea3ed8f8',
      memberName: '이진희',
      companyName: '(주)반도글로벌',
      companyType: '수출입기업',
      messages: [
        { id: 'demo-1', from: 'admin', text: WELCOME_TEXT, at: minutesAgo(95) },
        { id: 'demo-2', from: 'member', text: '매칭 요청을 보냈는데 운송사가 아직 응답이 없어요. 얼마나 기다려야 하나요?', at: minutesAgo(94) },
        { id: 'demo-3', from: 'admin', text: '운송사 응답은 보통 1~2영업일 안에 옵니다. 3일이 지나도 응답이 없으면 다른 추천 운송사에 요청하실 수 있도록 도와드릴게요.', at: minutesAgo(90) },
        { id: 'demo-4', from: 'member', text: '네 감사합니다. 혹시 인천항 → 상하이항 노선은 추천이 더 늘어날까요?', at: minutesAgo(12) },
      ],
      adminReadAt: minutesAgo(90),
      memberReadAt: minutesAgo(12),
    },
    {
      memberId: '02e5627c-b2ac-49d4-b5a7-fa998f3617bd',
      memberName: '강신호',
      companyName: 'CJ대한통운(주)',
      companyType: '물류업체',
      messages: [
        { id: 'demo-5', from: 'admin', text: WELCOME_TEXT, at: minutesAgo(60 * 26) },
        { id: 'demo-6', from: 'member', text: '운송 조건에 가용 물량을 수정하고 싶은데, 삭제 후 다시 등록해야 하나요?', at: minutesAgo(60 * 26 - 2) },
        { id: 'demo-7', from: 'admin', text: '네, 지금은 매칭 조건 설정에서 삭제 후 다시 등록해 주셔야 합니다. 수정 기능은 준비 중이에요.', at: minutesAgo(60 * 25) },
      ],
      adminReadAt: minutesAgo(60 * 25),
      memberReadAt: minutesAgo(60 * 25),
    },
  ];
}

/* ---------- 브라우저 저장 ---------- */

// 저장된 채팅방 목록 불러오기 (없거나 읽기 실패하면 처음 데모 데이터)
export function loadRooms(): ChatRoom[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) return list;
    }
  } catch {
    // localStorage 를 못 쓰는 환경이면 처음 데이터로
  }
  return demoRooms();
}

export function saveRooms(rooms: ChatRoom[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // 저장에 실패해도 지금 화면은 그대로 동작
  }
}

// 마지막 메시지 (목록 미리보기 · 정렬용)
export function lastMessage(room: ChatRoom): ChatMessage | undefined {
  return room.messages[room.messages.length - 1];
}

// 안 읽은 메시지 수 (reader 입장에서 상대가 보낸 것 중 마지막으로 읽은 시각 이후)
export function unreadCount(room: ChatRoom, reader: ChatSender) {
  const readAt = reader === 'admin' ? room.adminReadAt : room.memberReadAt;
  return room.messages.filter((m) => m.from !== reader && m.at > readAt).length;
}
