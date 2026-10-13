import { formatChatTime } from '../chatTime';
import useAdminChat from '../useAdminChat';
import ChatWindow from './ChatWindow';

// 관리자용 고객센터 상담 (관리자 마이페이지 오른쪽)
// - 왼쪽 : 채팅방 목록 (상담 중 → 종료 순 , 스크롤) — 안 읽은 메시지 수 · 상담 상태 표시
// - 오른쪽 : 고른 채팅방의 대화(지난 상담까지 전부) + 답장 + [상담 종료]
// 모든 방의 새 메시지가 웹소켓으로 실시간 전달 (useAdminChat)
export default function AdminChatConsole() {
  const { rooms, selectedRoom, messages, loading, connected, error, selectRoom, sendMessage, endChat } = useAdminChat();

  const totalUnread = rooms.reduce((sum, room) => sum + room.unreadCount, 0);

  // [상담 종료] — 실수로 누르지 않도록 한 번 더 확인
  const handleEnd = () => {
    if (!window.confirm('이 상담을 종료할까요?\n회원 화면의 입력창도 바로 잠깁니다.')) return;
    endChat();
  };

  return (
    <section className="mypage-card mypage-card--chat admin-chat">
      {/* 채팅방 목록 */}
      <div className="admin-chat__rooms">
        <div className="admin-chat__rooms-head">
          <p className="mypage-card__title">상담 채팅방</p>
          <span className="mypage-card__count">{rooms.length}</span>
          {totalUnread > 0 && <span className="admin-chat__unread-total">안 읽음 {totalUnread}</span>}
        </div>

        {error && <p className="mypage-error admin-chat__error">{error}</p>}

        <ul className="admin-chat__list">
          {rooms.map((room) => {
            const last = room.lastMessage;
            return (
              <li key={room.roomId}>
                <button
                  onClick={() => selectRoom(room.roomId)}
                  className={room.roomId === selectedRoom?.roomId ? 'admin-chat__room is-selected' : 'admin-chat__room'}
                >
                  <span className="admin-chat__avatar">{room.managerName ? room.managerName.charAt(0) : '?'}</span>
                  <span className="admin-chat__room-text">
                    <span className="admin-chat__room-top">
                      <span className="admin-chat__company">{room.companyName}</span>
                      {!room.status && <span className="admin-chat__tag">종료</span>}
                      {room.withdrawn && <span className="admin-chat__tag">탈퇴</span>}
                      <span className="admin-chat__time">{last ? formatChatTime(last.createdAt) : ''}</span>
                    </span>
                    <span className="admin-chat__room-bottom">
                      <span className="admin-chat__preview">
                        {last ? `${last.senderType === 'ADMIN' ? '고객센터: ' : ''}${last.content}` : '메시지 없음'}
                      </span>
                      {room.unreadCount > 0 && <span className="admin-chat__badge">{room.unreadCount}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {!loading && rooms.length === 0 && <li className="admin-chat__empty">아직 상담 채팅방이 없습니다.</li>}
        </ul>
      </div>

      {/* 고른 채팅방 대화 */}
      <div className="admin-chat__conversation">
        {selectedRoom ? (
          <ChatWindow
            title={selectedRoom.companyName}
            subtitle={`${selectedRoom.managerName} · ${selectedRoom.companyType}${selectedRoom.withdrawn ? ' · 탈퇴 회원' : ''}${connected ? '' : ' · 서버와 연결 중...'}`}
            messages={messages}
            me="ADMIN"
            connecting={!connected}
            closedNotice={selectedRoom.status ? undefined : '종료된 상담입니다. 회원이 새 상담을 시작하면 다시 대화할 수 있어요.'}
            onSend={sendMessage}
            onEnd={selectedRoom.status ? handleEnd : undefined}
          />
        ) : (
          <div className="admin-chat__placeholder">
            <p>왼쪽에서 채팅방을 고르면 상담 내용이 보여요.</p>
            <p className="admin-chat__placeholder-sub">회원이 마이페이지에서 [고객센터 채팅상담]을 누르면 채팅방이 생깁니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
