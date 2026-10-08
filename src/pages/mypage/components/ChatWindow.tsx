import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { formatChatTime, type ChatMessage, type ChatSender } from '../chatData';

interface ChatWindowProps {
  title: ReactNode;                 // 위쪽 제목 (예: '고객센터' , 회사명)
  subtitle?: ReactNode;             // 제목 아래 작은 글자
  messages: ChatMessage[];
  me: ChatSender;                   // 이 화면을 보는 사람 → 내 메시지는 오른쪽
  partnerLabel: string;             // 상대 메시지 위의 이름 (예: 'MACROSS 고객센터')
  onSend: (text: string) => void;
  onClose?: () => void;             // 있으면 오른쪽 위에 [닫기] 버튼
}

// 채팅창 1개 (메시지 목록 + 입력칸) — 회원 상담 화면 · 관리자 상담 화면 공통
export default function ChatWindow({ title, subtitle, messages, me, partnerLabel, onSend, onClose }: ChatWindowProps) {
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
    if (!text.trim()) return;
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
        {onClose && <button onClick={onClose} className="chat-window__close">닫기</button>}
      </div>

      <div ref={listRef} className="chat-window__list">
        {messages.map((message, index) => {
          const mine = message.from === me;
          // 날짜가 바뀌는 첫 메시지 앞에 날짜 줄
          const prev = messages[index - 1];
          const showDate = !prev || new Date(prev.at).toDateString() !== new Date(message.at).toDateString();
          return (
            <div key={message.id}>
              {showDate && (
                <p className="chat-date">{new Date(message.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
              )}
              <div className={mine ? 'chat-msg is-mine' : 'chat-msg'}>
                {!mine && <p className="chat-msg__name">{partnerLabel}</p>}
                <div className="chat-msg__row">
                  <p className="chat-msg__bubble">{message.text}</p>
                  <span className="chat-msg__time">{formatChatTime(message.at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="chat-window__form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={500}
          className="chat-window__input"
        />
        <button type="submit" disabled={!text.trim()} className="chat-window__send">보내기</button>
      </form>
    </div>
  );
}
