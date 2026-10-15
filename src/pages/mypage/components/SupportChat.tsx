import { useEffect, useState } from 'react';
import useSupportChat from '../useSupportChat';
import ChatWindow from './ChatWindow';

// 회원용 고객센터 채팅 상담 (마이페이지 오른쪽)
// [고객센터 채팅상담] 버튼
//   - 상담 중이면 → 채팅창을 바로 엶
//   - 처음이거나 지난 상담이 종료됐으면 → 상담 시작(POST /api/chat/rooms/me/open) 후 엶
// 메시지는 웹소켓으로 실시간 전달 (useSupportChat) — 어느 회원인지는 서버가 로그인 쿠키로 확인
export default function SupportChat() {
  const { room, messages, loading, connected, error, startChat, sendMessage, endChat, markAsRead } = useSupportChat();
  const [open, setOpen] = useState(false);   // 채팅창 열림 여부

  const unread = room?.unreadCount ?? 0;

  // 채팅창이 열려 있을 때 고객센터 답장이 오면 바로 읽음 처리
  useEffect(() => {
    if (open && unread > 0) markAsRead();
  }, [open, unread, markAsRead]);

  // [고객센터 채팅상담]
  const handleOpen = async () => {
    // 1. 상담 중이면 바로 열기
    if (room?.status) {
      setOpen(true);
      return;
    }
    // 2. 아니면 상담 시작 → 성공하면 열기
    const success = await startChat();
    if (success) setOpen(true);
  };

  // [상담 종료] — 실수로 누르지 않도록 한 번 더 확인
  const handleEnd = () => {
    if (!window.confirm('상담을 종료할까요?\n종료한 뒤에도 [새 상담 시작]으로 다시 문의할 수 있습니다.')) return;
    endChat();
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
        <button onClick={handleOpen} disabled={loading} className="support-intro__btn">
          고객센터 채팅상담
          {unread > 0 && <span className="support-intro__badge">{unread}</span>}
        </button>
        {room && (
          <p className="support-intro__hint">
            {room.status
              ? '상담이 진행 중이에요. 버튼을 누르면 이어서 대화할 수 있습니다.'
              : '지난 상담은 종료되었어요. 버튼을 누르면 새 상담이 시작됩니다.'}
          </p>
        )}
        {error && <p className="mypage-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="mypage-card mypage-card--chat">
      <ChatWindow
        title="MACROSS 고객센터"
        subtitle={connected ? '평일 09:00 ~ 18:00' : '서버와 연결 중...'}
        messages={messages}
        me="MEMBER"
        connecting={!connected}
        closedNotice={room.status ? undefined : (
          <>
            <span>상담이 종료되었습니다.</span>
            <button onClick={startChat} className="chat-window__restart">새 상담 시작</button>
          </>
        )}
        onSend={sendMessage}
        onEnd={room.status ? handleEnd : undefined}
        onClose={() => setOpen(false)}
      />
      {error && <p className="mypage-error chat-window__error">{error}</p>}
    </section>
  );
}
