import { useEffect, useState } from 'react';
import type { User } from '../../types/user';
import { loadRooms, newMessageId, saveRooms, STORAGE_KEY, WELCOME_TEXT, type ChatRoom, type ChatSender } from './chatData';

// 고객센터 채팅 데모 데이터를 다루는 훅 (회원 화면 · 관리자 화면이 같이 사용)
// - 처음 : 브라우저에 저장된 채팅방을 불러옴
// - 다른 탭에서 메시지를 보내면 storage 이벤트로 바로 다시 불러옴 (같은 브라우저의 회원 탭 ↔ 관리자 탭)
// ⚠️ 백엔드 채팅 API 가 생기면 이 훅 안을 axios 호출(조회 / 보내기 / 읽음 처리)로 바꾸면 화면 코드는 그대로 쓸 수 있음
export default function useSupportChat() {
  // useState(() => 값) : 처음 한 번만 함수를 실행해서 시작 값을 만듦
  const [rooms, setRooms] = useState<ChatRoom[]>(() => loadRooms());

  // 다른 탭에서 저장하면 다시 불러오기
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setRooms(loadRooms());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 바꾼 목록을 화면 + 브라우저에 저장
  // (항상 저장된 최신 목록을 읽어서 바꿈 → 다른 탭에서 방금 보낸 메시지를 덮어쓰지 않도록)
  const update = (change: (list: ChatRoom[]) => ChatRoom[]) => {
    const next = change(loadRooms());
    setRooms(next);
    saveRooms(next);
  };

  // 회원 : 내 채팅방 열기 (없으면 만들고 고객센터 인사를 넣음)
  const openRoom = (user: User) => {
    if (!user.memberId) return;
    update((list) => {
      if (list.some((room) => room.memberId === user.memberId)) return list;
      const now = new Date().toISOString();
      const room: ChatRoom = {
        memberId: user.memberId!,
        memberName: user.name,
        companyName: user.companyName ?? '-',
        companyType: user.companyType ?? '-',
        messages: [{ id: newMessageId(), from: 'admin', text: WELCOME_TEXT, at: now }],
        adminReadAt: now,
        memberReadAt: now,
      };
      return [...list, room];
    });
  };

  // 메시지 보내기 (from : 회원이 보내면 'member' , 고객센터가 보내면 'admin')
  // 보낸 사람은 자기 메시지까지 읽은 것으로 처리
  const sendMessage = (memberId: string, from: ChatSender, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    update((list) => list.map((room) => {
      if (room.memberId !== memberId) return room;
      return {
        ...room,
        messages: [...room.messages, { id: newMessageId(), from, text: trimmed, at: now }],
        adminReadAt: from === 'admin' ? now : room.adminReadAt,
        memberReadAt: from === 'member' ? now : room.memberReadAt,
      };
    }));
  };

  // 읽음 처리 (채팅방을 보고 있는 사람 기준)
  const markRead = (memberId: string, reader: ChatSender) => {
    const now = new Date().toISOString();
    update((list) => list.map((room) => {
      if (room.memberId !== memberId) return room;
      return reader === 'admin' ? { ...room, adminReadAt: now } : { ...room, memberReadAt: now };
    }));
  };

  return { rooms, openRoom, sendMessage, markRead };
}
