import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { MessageDto, SenderType } from '../../../api/chatApi';
import { formatChatTime } from '../chatTime';

interface ChatWindowProps {
  title: ReactNode;                 // 위쪽 제목 (예: '고객센터' , 회사명)
  subtitle?: ReactNode;             // 제목 아래 작은 글자
  messages: MessageDto[];
  me: SenderType;                   // 이 화면을 보는 사람 ('MEMBER' 또는 'ADMIN') → 내 메시지는 오른쪽
  partnerLabel: string;             // 상대 메시지 위의 이름 (예: 'MACROSS 고객센터')
  connecting?: boolean;             // true 면 서버와 연결 중 → 입력칸 잠금
  closedNotice?: ReactNode;         // 있으면 입력칸 대신 이 안내를 보여 줌 (상담이 종료된 방)
  onSend: (text: string) => void;
  onEnd?: () => void;               // 있으면 오른쪽 위에 [상담 종료] 버튼
  onClose?: () => void;             // 있으면 오른쪽 위에 [닫기] 버튼
}

// 채팅창 1개 (메시지 목록 + 입력칸) — 회원 상담 화면 · 관리자 상담 화면 공통
// - 말풍선 : 내가 보낸 것(senderType === me)은 오른쪽 , 상대가 보낸 것은 왼쪽
// - SYSTEM 메시지("상담이 시작되었습니다" 등)는 가운데 안내 줄로
export default function ChatWindow({ title, subtitle, messages, me, partnerLabel, connecting, closedNotice, onSend, onEnd, onClose }: ChatWindowProps) {
  const [text, setText] = useState('');
  // useRef : 화면 요소를 직접 잡아 두는 상자 (가이드 3-2) — 새 메시지가 오면 맨 아래로 스크롤하기 위해
  const listRef = useRef<HTMLDivElement>(null);

  // 메시지 수가 바뀌면 맨 아래로
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  // [보내기] 또는 Enter
  // [TS] FormEvent : form 의 onSubmit 이벤트 타입
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();   // form 기본 동작(페이지 새로고침) 막기
    if (!text.trim() || connecting) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="chat-window">
      <div className="chat-window__head">
        <div className="chat-window__title">
          <p>{title}</p>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {onEnd && <button onClick={onEnd} className="chat-window__end">상담 종료</button>}
        {onClose && <button onClick={onClose} className="chat-window__close">닫기</button>}
      </div>

      <div ref={listRef} className="chat-window__list">
        {messages.map((message, index) => {
          const mine = message.senderType === me;
          // 날짜가 바뀌는 첫 메시지 앞에 날짜 줄
          const prev = messages[index - 1];
          const showDate = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          return (
            <div key={message.messageId}>
              {showDate && (
                <p className="chat-date">{new Date(message.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
              )}
              {message.senderType === 'SYSTEM' ? (
                <p className="chat-system">{message.content} · {formatChatTime(message.createdAt)}</p>
              ) : (
                <div className={mine ? 'chat-msg is-mine' : 'chat-msg'}>
                  {!mine && <p className="chat-msg__name">{partnerLabel}</p>}
                  <div className="chat-msg__row">
                    <p className="chat-msg__bubble">{message.content}</p>
                    <span className="chat-msg__time">{formatChatTime(message.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 상담이 종료된 방이면 입력칸 대신 안내 */}
      {closedNotice ? (
        <div className="chat-window__closed">{closedNotice}</div>
      ) : (
        <form onSubmit={handleSubmit} className="chat-window__form">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={connecting ? '서버와 연결 중입니다...' : '메시지를 입력하세요'}
            maxLength={1000}
            disabled={connecting}
            className="chat-window__input"
          />
          <button type="submit" disabled={!text.trim() || connecting} className="chat-window__send">보내기</button>
        </form>
      )}
    </div>
  );
}
