import { useEffect, useState } from 'react';
import type { User } from '../../../types/user';
import { unreadCount } from '../chatData';
import useSupportChat from '../useSupportChat';
import ChatWindow from './ChatWindow';

// 회원용 고객센터 채팅 상담 (마이페이지 오른쪽)
// [고객센터 채팅상담] 버튼 → 내 채팅방이 열림 (처음이면 채팅방을 만들고 고객센터 인사가 들어감)
// ⚠️ 프론트 데모 — 대화는 이 브라우저에만 저장 (관리자 계정으로 로그인하면 같은 대화가 보임)
export default function SupportChat({ user }: { user: User }) {
  const { rooms, openRoom, sendMessage, markRead } = useSupportChat();
  const [open, setOpen] = useState(false);

  const room = rooms.find((r) => r.memberId === user.memberId);
  const unread = room ? unreadCount(room, 'member') : 0;

  // 채팅창이 열려 있을 때 고객센터 답장이 오면 바로 읽음 처리
  useEffect(() => {
    if (open && room && unread > 0) markRead(room.memberId, 'member');
  }, [open, room, unread, markRead]);

  const startChat = () => {
    openRoom(user);
    setOpen(true);
  };

  // 채팅창이 닫혀 있을 때 : 안내 + [고객센터 채팅상담] 버튼
  if (!open || !room) {
    return (
      <section className="mypage-card support-intro">
        <div className="support-intro__icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">
            <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
            <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="support-intro__title">고객센터 채팅 상담</h2>
        <p className="support-intro__desc">
          매칭 조건 설정 , 매칭 요청 · 수락 , 회원 정보 등 궁금한 점을 고객센터에 물어보세요.
          <br />평일 09:00 ~ 18:00 에 답변드립니다.
        </p>
        <button onClick={startChat} disabled={!user.memberId} className="support-intro__btn">
          고객센터 채팅상담
          {unread > 0 && <span className="support-intro__badge">{unread}</span>}
        </button>
        {room && room.messages.length > 1 && (
          <p className="support-intro__hint">이전 상담 내용이 있어요. 버튼을 누르면 이어서 대화할 수 있습니다.</p>
        )}
        {!user.memberId && <p className="mypage-error">회원 번호가 없어 상담을 시작할 수 없습니다. 다시 로그인해 주세요.</p>}
      </section>
    );
  }

  return (
    <section className="mypage-card mypage-card--chat">
      <ChatWindow
        title="MACROSS 고객센터"
        subtitle="평일 09:00 ~ 18:00 · 이 브라우저에 저장되는 예시 채팅"
        messages={room.messages}
        me="member"
        partnerLabel="MACROSS 고객센터"
        onSend={(text) => sendMessage(room.memberId, 'member', text)}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
