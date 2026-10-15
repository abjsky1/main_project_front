import { useEffect, useRef, useState } from 'react';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import {
  CHAT_SEND_DESTINATION, chatRoomTopic, closeRoom, getChatSocketUrl, getMessages, getMyRoom, markRead, openMyRoom,
  type MessageDto, type MessageSendDto, type RoomDto,
} from '../../api/chatApi';

// 회원용 고객센터 채팅 훅 (SupportChat 화면이 사용 , 관리자 화면은 useAdminChat)
// - REST (chatApi)  : 내 채팅방 불러오기 · 상담 시작/종료 · 읽음 처리
// - 웹소켓 (STOMP)  : 내 방 주소(/sub/chat/room/{방번호})를 구독해서 새 메시지를 실시간으로 받음 , 보내기도 웹소켓으로
//   → B_react day062 ChatRoom.jsx 와 같은 방식 (new Client → onConnect 에서 subscribe → activate , 화면이 사라지면 deactivate)
// - 누가 보냈는지는 서버가 웹소켓 연결 때 쿠키로 확인 → 화면은 방 번호와 내용만 보냄
export default function useSupportChat() {
  const [room, setRoom] = useState<RoomDto | null>(null);       // 내 채팅방 (상담을 한 번도 안 했으면 null)
  const [messages, setMessages] = useState<MessageDto[]>([]);   // 이번 상담 메시지
  const [loading, setLoading] = useState(true);                 // 처음 불러오는 중
  const [connected, setConnected] = useState(false);            // 웹소켓 연결 여부 (false 면 입력칸 잠금)
  const [error, setError] = useState('');
  // useRef : 다시 그려져도 값이 유지되는 상자 — 보내기 함수에서 연결 객체를 쓰려고 (day062 의 clientRef 와 같음)
  const clientRef = useRef<Client | null>(null);

  const roomId = room?.roomId;

  // 1. 처음 한 번 : 내 채팅방 불러오기 (안 읽음 수 · 진행 중인 상담이 있는지 보여 주려고)
  useEffect(() => {
    let ignore = false;   // 응답 전에 화면이 사라지면 true → 늦게 온 응답 무시 (가이드 3-4)

    async function fetchMyRoom() {
      try {
        const myRoom = await getMyRoom();
        if (ignore) return;
        setRoom(myRoom);
        setMessages(myRoom?.messages ?? []);
      } catch (error) {
        console.log('내 채팅방 조회 실패 : ', error);
        if (!ignore) setError('채팅방을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchMyRoom();

    return () => {
      ignore = true;
    };
  }, []);

  // 2. 방 번호가 생기면 웹소켓 연결 + 내 방 구독
  //    방이 없으면(상담을 한 번도 안 함) 연결하지 않음 → [고객센터 채팅상담] 으로 방이 생기면 그때 연결
  useEffect(() => {
    if (roomId == null) return;

    const client = new Client({
      // 2-1. 연결 주소 : ws://지금주소/ws/chat → Vite 프록시 → 백엔드 (로그인 쿠키가 같이 가서 서버가 회원을 확인)
      brokerURL: getChatSocketUrl(),
      // 2-2. 끊기면 자동으로 다시 연결 (다시 연결할 때도 쿠키로 다시 확인)
      //      기다리는 시간을 1초 → 2초 → 4초 … 최대 30초로 점점 늘림 (Backoff — 서버가 꺼져 있을 때 계속 두드리지 않게)
      //      연결에 성공하면 다시 1초부터
      reconnectDelay: 1000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30000,
      //      하트비트 : 10초마다 "살아 있음" 신호를 주고받음 (서버 WebSocketConfig 와 같은 값) → 조용히 끊긴 연결을 빨리 알아챔
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // 2-3. 연결 성공 (다시 연결됐을 때도 실행)
      onConnect: () => {
        setConnected(true);

        // 내 방 구독 : 새 메시지 · 상담 시작/종료 안내가 오면 실행
        client.subscribe(chatRoomTopic(roomId), (frame) => {
          const message: MessageDto = JSON.parse(frame.body);   // JSON 글자 → 객체 (day062 와 같음)

          // 대화에 추가 — 이미 있는 메시지면 그대로 (상담 시작 응답과 웹소켓으로 같은 메시지가 올 수 있음)
          // setMessages(prev => ...) : 항상 최신 목록에 추가 (day062 [원인2] 의 해결 방법)
          setMessages((prev) => (prev.some((m) => m.messageId === message.messageId) ? prev : [...prev, message]));

          // 방 상태 · 안 읽음 수 갱신 (고객센터(ADMIN)가 보낸 메시지만 회원의 "안 읽음" — 서버와 같은 규칙)
          setRoom((prev) => prev && {
            ...prev,
            status: message.roomStatus,
            lastMessage: message,
            unreadCount: message.senderType === 'ADMIN' ? prev.unreadCount + 1 : prev.unreadCount,
          });
        });

        // 연결되기 전 · 끊겨 있던 동안 온 메시지 채우기 (구독을 시작한 "뒤" 에 목록을 다시 받아야 빠지는 메시지가 없음)
        getMessages(roomId)
          .then((list) => {
            if (!list) return;
            // 서버 목록 + (목록을 받는 사이에 웹소켓으로 먼저 도착한 더 새로운 메시지)
            const lastId = list.length > 0 ? list[list.length - 1].messageId : 0;
            setMessages((prev) => [...list, ...prev.filter((m) => m.messageId > lastId)]);
          })
          .catch((error) => console.log('메시지 다시 받기 실패 : ', error));
      },
      // 2-4. 연결이 끊김 (reconnectDelay 뒤에 자동으로 다시 연결 시도)
      onWebSocketClose: () => setConnected(false),
    });

    // 2-5. 연결 시작 + 보내기 함수에서 쓰려고 보관
    client.activate();
    clientRef.current = client;

    // 2-6. 화면이 사라지면(로그아웃 · 다른 페이지로 이동 포함) 연결 끊기
    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [roomId]);

  // 3. 상담 시작 : 방이 없으면 만들고 , 종료된 방이면 다시 켬 (이미 상담 중이면 그대로)
  //    방 번호가 처음 생기면 2번이 웹소켓을 연결함
  //    돌려주는 값 : 성공하면 true
  const startChat = async () => {
    try {
      setError('');
      const openedRoom = await openMyRoom();
      if (!openedRoom) {
        setError('상담을 시작하지 못했습니다. 다시 로그인해 주세요.');
        return false;
      }
      setRoom(openedRoom);
      setMessages(openedRoom.messages ?? []);   // 다시 켠 방이면 이번 상담 메시지부터 (새 창)
      return true;
    } catch (error) {
      console.log('상담 시작 실패 : ', error);
      setError('상담을 시작하지 못했습니다.');
      return false;
    }
  };

  // 4. 메시지 보내기 : 웹소켓으로 발행
  //    화면에 바로 추가하지 않음 → 서버가 저장한 뒤 구독 주소로 돌려준 메시지가 2번 구독에서 추가됨 (저장 안 된 메시지가 뜨지 않게)
  const sendMessage = (content: string) => {
    const client = clientRef.current;
    // 연결이 안 됐으면 보내지 않음 (day062 : client.connected 확인)
    if (roomId == null || client == null || !client.connected) return;

    // [TS] MessageSendDto : 서버가 받는 모양 { roomId , content } — 보낸 사람은 넣지 않음
    const body: MessageSendDto = { roomId, content };
    client.publish({ destination: CHAT_SEND_DESTINATION, body: JSON.stringify(body) });
  };

  // 5. 상담 종료 : 성공하면 종료 안내가 웹소켓으로도 옴 (roomStatus: false)
  const endChat = async () => {
    if (roomId == null) return;
    try {
      const success = await closeRoom(roomId);
      if (success) {
        setRoom((prev) => prev && { ...prev, status: false });
      } else {
        setError('상담을 종료하지 못했습니다.');
      }
    } catch (error) {
      console.log('상담 종료 실패 : ', error);
      setError('상담을 종료하지 못했습니다.');
    }
  };

  // 6. 읽음 처리 : 채팅창을 보고 있을 때 화면(SupportChat)이 부름 → 안 읽음 0
  const markAsRead = async () => {
    if (roomId == null) return;
    setRoom((prev) => prev && { ...prev, unreadCount: 0 });   // 화면에서 먼저 0 으로 (뱃지가 바로 사라지게)
    try {
      await markRead(roomId);
    } catch (error) {
      console.log('읽음 처리 실패 : ', error);   // 실패해도 다음 메시지가 올 때 다시 읽음 처리됨
    }
  };

  return { room, messages, loading, connected, error, startChat, sendMessage, endChat, markAsRead };
}
