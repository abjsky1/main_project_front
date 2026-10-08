import { useEffect, useState } from 'react';
import { formatChatTime, lastMessage, unreadCount } from '../chatData';
import useSupportChat from '../useSupportChat';
import ChatWindow from './ChatWindow';

// 관리자용 고객센터 상담 (관리자 마이페이지 오른쪽)
// - 왼쪽 : 채팅방 목록 (최근 메시지 순 , 스크롤) — 안 읽은 메시지 수 표시
// - 오른쪽 : 고른 채팅방의 대화 + 답장
// ⚠️ 프론트 데모 — 회원이 이 브라우저에서 보낸 상담만 보임
export default function AdminChatConsole() {
  const { rooms, sendMessage, markRead } = useSupportChat();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 최근 메시지가 위로
  const sorted = [...rooms].sort((a, b) => (lastMessage(b)?.at ?? '').localeCompare(lastMessage(a)?.at ?? ''));
  const selected = sorted.find((room) => room.memberId === selectedId) ?? null;
  const selectedUnread = selected ? unreadCount(selected, 'admin') : 0;

  // 고른 채팅방에 안 읽은 메시지가 있으면 읽음 처리 (보고 있는 중에 새 메시지가 와도)
  useEffect(() => {
    if (selected && selectedUnread > 0) markRead(selected.memberId, 'admin');
  }, [selected, selectedUnread, markRead]);

  const totalUnread = rooms.reduce((sum, room) => sum + unreadCount(room, 'admin'), 0);

  return (
    <section className="mypage-card mypage-card--chat admin-chat">
      {/* 채팅방 목록 */}
      <div className="admin-chat__rooms">
        <div className="admin-chat__rooms-head">
          <p className="mypage-card__title">상담 채팅방</p>
          <span className="mypage-card__count">{rooms.length}</span>
          {totalUnread > 0 && <span className="admin-chat__unread-total">안 읽음 {totalUnread}</span>}
        </div>

        <ul className="admin-chat__list">
          {sorted.map((room) => {
            const last = lastMessage(room);
            const unread = unreadCount(room, 'admin');
            return (
              <li key={room.memberId}>
                <button
                  onClick={() => setSelectedId(room.memberId)}
                  className={room.memberId === selectedId ? 'admin-chat__room is-selected' : 'admin-chat__room'}
                >
                  <span className="admin-chat__avatar">{room.memberName.charAt(0)}</span>
                  <span className="admin-chat__room-text">
                    <span className="admin-chat__room-top">
                      <span className="admin-chat__company">{room.companyName}</span>
                      <span className="admin-chat__time">{last ? formatChatTime(last.at) : ''}</span>
                    </span>
                    <span className="admin-chat__room-bottom">
                      <span className="admin-chat__preview">
                        {last ? `${last.from === 'admin' ? '고객센터: ' : ''}${last.text}` : '메시지 없음'}
                      </span>
                      {unread > 0 && <span className="admin-chat__badge">{unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {rooms.length === 0 && <li className="admin-chat__empty">아직 상담 채팅방이 없습니다.</li>}
        </ul>
      </div>

      {/* 고른 채팅방 대화 */}
      <div className="admin-chat__conversation">
        {selected ? (
          <ChatWindow
            title={selected.companyName}
            subtitle={`${selected.memberName} · ${selected.companyType}`}
            messages={selected.messages}
            me="admin"
            partnerLabel={`${selected.memberName} (${selected.companyName})`}
            onSend={(text) => sendMessage(selected.memberId, 'admin', text)}
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
