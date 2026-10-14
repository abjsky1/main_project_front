import { useEffect, useRef, useState } from 'react';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import {
  CHAT_ADMIN_TOPIC, CHAT_SEND_DESTINATION, closeRoom, getChatSocketUrl, getMessages, getRooms, markRead,
  type MessageDto, type MessageSendDto, type RoomDto,
} from '../../api/chatApi';

// 관리자용 고객센터 채팅 훅 (AdminChatConsole 화면이 사용 , 회원 화면은 useSupportChat)
// - REST (chatApi)  : 채팅방 목록 · 고른 방의 메시지(지난 상담까지 전부) · 읽음 처리 · 상담 종료
// - 웹소켓 (STOMP)  : 관리자 주소(/sub/chat/admin)를 구독 → 모든 방의 새 메시지가 한 주소로 옴 (메시지의 roomId 로 방을 구분)
// - 회원 화면과 다른 점 : 방이 여러 개 → 목록의 "마지막 메시지 · 안 읽음 수" 를 같이 갱신
export default function useAdminChat() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);              // 채팅방 목록 (서버 순서 : 상담 중 → 종료)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);     // 고른 방의 메시지
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef<Client | null>(null);
  // 지금 고른 방 번호를 ref 에도 보관
  // - 구독 콜백은 연결할 때 한 번 만들어져서 , 그 안에서 selectedId state 를 읽으면 처음 값(null)에 고정됨
  //   (day062 [원인2] 의 오래된 값 문제 — 여기서는 setXxx(prev => ...) 로 해결할 수 없는 "읽기" 라서 ref 를 씀)
  const selectedIdRef = useRef<number | null>(null);

  // 1. 처음 한 번 : 채팅방 목록 불러오기
  useEffect(() => {
    let ignore = false;

    async function fetchRooms() {
      try {
        const list = await getRooms();
        if (ignore) return;
        if (list) {
          setRooms(list);
        } else {
          setError('관리자만 볼 수 있습니다.');
        }
      } catch (error) {
        console.log('채팅방 목록 조회 실패 : ', error);
        if (!ignore) setError('채팅방 목록을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchRooms();

    return () => {
      ignore = true;
    };
  }, []);

  // 2. 처음 한 번 : 웹소켓 연결 + 관리자 주소 구독
  useEffect(() => {
    const client = new Client({
      brokerURL: getChatSocketUrl(),   // useSupportChat 의 2-1 과 같음
      // 다시 연결 간격 1초 → 2초 → 4초 … 최대 30초 , 하트비트 10초 (useSupportChat 의 2-2 와 같음)
      reconnectDelay: 1000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // 2-1. 연결 성공 (다시 연결됐을 때도 실행)
      onConnect: () => {
        setConnected(true);

        // 관리자 주소 구독 : 어느 방이든 새 메시지 · 상담 시작/종료 안내가 오면 실행
        client.subscribe(CHAT_ADMIN_TOPIC, (frame) => {
          const message: MessageDto = JSON.parse(frame.body);
          const isSelected = message.roomId === selectedIdRef.current;   // 지금 보고 있는 방의 메시지인지

          // ① 목록에서 그 방 한 줄 갱신 (마지막 메시지 , 상담 상태 , 안 읽음 수)
          //    보고 있지 않은 방에 회원(MEMBER)이 보낸 메시지면 안 읽음 +1 (서버와 같은 규칙)
          setRooms((prev) => prev.map((room) => (room.roomId !== message.roomId ? room : {
            ...room,
            lastMessage: message,
            status: message.roomStatus,
            unreadCount: !isSelected && message.senderType === 'MEMBER' ? room.unreadCount + 1 : room.unreadCount,
          })));

          // ② 상담 시작 · 종료 안내(SYSTEM)면 목록을 다시 받음 (처음 상담한 회원의 새 방이 생기거나 , 순서가 바뀜)
          if (message.senderType === 'SYSTEM') {
            getRooms()
              .then((list) => { if (list) setRooms(list); })
              .catch((error) => console.log('채팅방 목록 다시 받기 실패 : ', error));
          }

          // ③ 보고 있는 방이면 대화에 추가 (이미 있으면 그대로) + 회원 메시지면 바로 읽음 처리
          if (isSelected) {
            setMessages((prev) => (prev.some((m) => m.messageId === message.messageId) ? prev : [...prev, message]));
            if (message.senderType === 'MEMBER') {
              markRead(message.roomId).catch((error) => console.log('읽음 처리 실패 : ', error));
            }
          }
        });

        // 연결되기 전 · 끊겨 있던 동안 바뀐 것 채우기 (구독을 시작한 "뒤" 에 다시 받음)
        // - 목록
        getRooms()
          .then((list) => { if (list) setRooms(list); })
          .catch((error) => console.log('채팅방 목록 다시 받기 실패 : ', error));
        // - 보고 있는 방의 메시지 (응답 전에 다른 방을 골랐으면 무시)
        const currentId = selectedIdRef.current;
        if (currentId != null) {
          getMessages(currentId)
            .then((list) => { if (list && selectedIdRef.current === currentId) setMessages(list); })
            .catch((error) => console.log('메시지 다시 받기 실패 : ', error));
        }
      },
      // 2-2. 연결이 끊김 (reconnectDelay 뒤에 자동으로 다시 연결 시도)
      onWebSocketClose: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    // 2-3. 화면이 사라지면 연결 끊기
    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, []);

  // 3. 채팅방 고르기 : 그 방의 메시지(지난 상담까지 전부) 불러오기 + 읽음 처리
  const selectRoom = async (roomId: number) => {
    setSelectedId(roomId);
    selectedIdRef.current = roomId;
    setMessages([]);   // 이전 방 대화가 잠깐 보이지 않게
    setError('');
    try {
      const list = await getMessages(roomId);
      if (selectedIdRef.current !== roomId) return;   // 응답 전에 다른 방을 골랐으면 무시
      setMessages(list ?? []);
      // 읽음 처리 → 그 방 안 읽음 0
      setRooms((prev) => prev.map((room) => (room.roomId === roomId ? { ...room, unreadCount: 0 } : room)));
      await markRead(roomId);
    } catch (error) {
      console.log('메시지 조회 실패 : ', error);
      setError('메시지를 불러오지 못했습니다.');
    }
  };

  // 4. 메시지 보내기 (고른 방으로) — useSupportChat 의 4번과 같음
  const sendMessage = (content: string) => {
    const client = clientRef.current;
    if (selectedId == null || client == null || !client.connected) return;

    const body: MessageSendDto = { roomId: selectedId, content };
    client.publish({ destination: CHAT_SEND_DESTINATION, body: JSON.stringify(body) });
  };

  // 5. 상담 종료 (고른 방) : 종료 안내가 웹소켓으로 와서 2-1 의 ① · ② 가 목록을 갱신함
  const endChat = async () => {
    if (selectedId == null) return;
    try {
      const success = await closeRoom(selectedId);
      if (!success) setError('상담을 종료하지 못했습니다.');
    } catch (error) {
      console.log('상담 종료 실패 : ', error);
      setError('상담을 종료하지 못했습니다.');
    }
  };

  const selectedRoom = rooms.find((room) => room.roomId === selectedId) ?? null;

  return { rooms, selectedRoom, messages, loading, connected, error, selectRoom, sendMessage, endChat };
}
