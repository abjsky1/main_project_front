import axios from 'axios';

// 백엔드 고객센터 채팅 API (main_project_back 의 ChatController · WebSocketConfig)
// - REST (이 파일의 함수들) : 지난 대화 불러오기 · 상담 시작/종료 · 읽음 처리
// - 웹소켓 (STOMP)         : 실시간 메시지 보내기 · 받기 → 주소만 아래에 모아 두고 , 연결은 useSupportChat 에서
// - 누가 요청했는지는 서버가 로그인 쿠키(AccessToken)로 정함 → 모든 요청에 withCredentials: true 로 쿠키를 같이 보냄
// - 권한이 없거나 실패하면 서버가 null(빈 응답) / false 를 돌려줌

// ---------- 서버가 보내 주는 모양 ----------

// 보낸 사람 종류 — 말풍선 위치 · 모양을 정함 (MEMBER = 회원 , ADMIN = 상담원 , SYSTEM = 상담 시작/종료 안내)
export type SenderType = 'MEMBER' | 'ADMIN' | 'SYSTEM';

// 채팅 메시지 1개 — MessageDto (REST 응답과 웹소켓으로 오는 새 메시지가 같은 모양)
export interface MessageDto {
  messageId: number;       // 말풍선 목록의 key
  roomId: number;          // 어느 방의 메시지인지 (관리자 화면은 모든 방의 메시지를 한 주소로 받아서 이 번호로 구분)
  senderType: SenderType;
  senderName: string;      // 회원 화면에는 상담원 이름 대신 "고객센터" 로 옴
  content: string;
  createdAt: string;       // "2026-10-10T14:05:30" (new Date( ) 로 바로 읽을 수 있는 모양)
  roomStatus: boolean;     // 이 메시지를 보낼 때의 방 상태 (false 면 상담 종료 → 회원 화면은 입력창을 잠금)
}

// 채팅방 1개 — RoomDto
export interface RoomDto {
  roomId: number;                 // 웹소켓 구독 주소 /sub/chat/room/{roomId} 에도 사용
  managerName: string;            // 상담을 시작할 때 복사해 둔 회원 정보 (탈퇴해도 그대로 보임)
  companyName: string;
  companyType: string;
  withdrawn: boolean;             // 탈퇴한 회원의 방이면 true
  status: boolean;                // true = 상담 중 , false = 종료
  openedAt: string | null;        // 마지막으로 켜진 시각
  closedAt: string | null;        // 마지막으로 꺼진 시각 (상담 중이면 null)
  lastMessage: MessageDto | null; // 가장 최근 메시지 (관리자 목록의 미리보기 , 없으면 null)
  unreadCount: number;            // 보는 사람 기준 안 읽은 메시지 수
  messages: MessageDto[] | null;  // 회원 내 채팅방에서만 채워짐 (이번 상담 메시지) , 관리자 목록에서는 null
}

// 메시지 보내기 요청 — MessageSendDto (웹소켓 /pub/chat/message 로 보내는 body)
// - 누가 보냈는지는 넣지 않음 → 서버가 웹소켓 연결 때 쿠키로 확인한 회원으로 정함
export interface MessageSendDto {
  roomId: number;
  content: string;   // 서버에서 앞뒤 빈칸을 지우고 , 비었거나 1000자를 넘으면 저장하지 않음
}

// ---------- 웹소켓 (STOMP) 주소 ----------
// 백엔드 WebSocketConfig 의 주소와 같아야 함 (연결 /ws/chat , 보내기 /pub , 받기 /sub)

// 연결 주소 : 지금 열린 페이지 주소를 기준으로 만듦 → 개발(localhost:8443)이든 배포든 코드를 고칠 필요가 없음
// - 개발 : ws://localhost:8443/ws/chat → Vite 프록시가 백엔드(8080)로 넘김 (vite.config.ts)
// - https 사이트면 wss:// (암호화된 웹소켓)
export function getChatSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/chat`;
}

// 보내는 주소 : /pub + ChatMessageController 의 @MessageMapping("/chat/message")
export const CHAT_SEND_DESTINATION = '/pub/chat/message';

// 받는 주소 (구독)
// - 회원 : 내 방의 새 메시지 · 상담 시작/종료 안내
// - 관리자 : 모든 방의 새 메시지 (채팅방 목록 · 안 읽음 수 갱신)
export const chatRoomTopic = (roomId: number) => `/sub/chat/room/${roomId}`;
export const CHAT_ADMIN_TOPIC = '/sub/chat/admin';

// ---------- REST API ----------
// [TS] RoomDto | null : 서버가 null 을 돌려주면 빈 응답이 오고 , axios 는 이걸 빈 글자('')로 줌
//      → response.data || null 로 '' 를 null 로 바꿔서 돌려줌 (화면에서는 null 인지만 보면 됨)

// ① GET /api/chat/rooms/me : 내 채팅방 (기업 회원)
// - 방 정보 + 이번 상담 메시지(messages) + 안 읽음 수
// - 상담을 한 번도 안 했거나 , 관리자 · 비로그인이면 null
export async function getMyRoom(signal?: AbortSignal) {
  const response = await axios.get<RoomDto | null>('/api/chat/rooms/me', { signal, withCredentials: true });
  return response.data || null;
}

// ② POST /api/chat/rooms/me/open : 상담 시작 (기업 회원)
// - 방이 없으면 만들고 , 종료된 방이면 다시 켬 → 방 정보 + 이번 상담 메시지 ("상담이 시작되었습니다" · 고객센터 인사 포함)
// - 이미 상담 중이면 그 방을 그대로 돌려줌 (버튼을 두 번 누르거나 탭을 두 개 연 경우) , 관리자 · 비로그인 · 비활성 회원이면 null
export async function openMyRoom() {
  const response = await axios.post<RoomDto | null>('/api/chat/rooms/me/open', {}, { withCredentials: true });
  return response.data || null;
}

// ③ PUT /api/chat/rooms/{roomId}/close : 상담 종료 (그 방의 회원 또는 관리자) , 성공하면 true
// - 없는 방 · 남의 방 · 이미 종료된 방이면 false
// - 종료 안내 메시지는 웹소켓으로도 옴 (roomStatus: false)
export async function closeRoom(roomId: number) {
  const response = await axios.put<boolean>(`/api/chat/rooms/${roomId}/close`, {}, { withCredentials: true });
  return response.data;
}

// ④ GET /api/chat/rooms : 관리자 채팅방 목록 (관리자)
// - 상담 중(켜진 시각이 오래된 순) → 종료(꺼진 시각이 최근 순) , 목록에는 messages 가 비어 있음
// - 관리자가 아니면 null
export async function getRooms(signal?: AbortSignal) {
  const response = await axios.get<RoomDto[] | null>('/api/admin/chat/rooms', { signal, withCredentials: true });
  return response.data || null;
}

// ⑤ GET /api/chat/rooms/{roomId}/messages : 한 방의 메시지 목록 (그 방의 회원 또는 관리자)
// - 관리자 : 지난 상담까지 전부 , 회원 : 이번 상담만
// - 없는 방 · 남의 방이면 null
export async function getMessages(roomId: number, signal?: AbortSignal) {
  const response = await axios.get<MessageDto[] | null>(`/api/chat/rooms/${roomId}/messages`, { signal, withCredentials: true });
  return response.data || null;
}

// ⑥ PUT /api/chat/rooms/{roomId}/read : 읽음 처리 (그 방의 회원 또는 관리자) , 성공하면 true
// - 채팅방을 열어 둔 채로 새 메시지를 받았을 때도 불러서 "안 읽음" 이 쌓이지 않게 함
// - 없는 방 · 남의 방이면 false
export async function markRead(roomId: number) {
  const response = await axios.put<boolean>(`/api/chat/rooms/${roomId}/read`, {}, { withCredentials: true });
  return response.data;
}
