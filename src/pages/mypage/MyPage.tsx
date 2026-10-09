/* =====================================================================
   마이페이지 (주소: /mypage , 로그인한 회원 — 헤더 오른쪽 동그라미 버튼으로 들어옴)
   - 왼쪽(1) 내 정보 : 로그인할 때 받은 회원 정보 표시 + 이름 · 주소 수정 (PUT /api/mypage/{memberId})
                       + 비밀번호 변경 (PUT /api/mypage/password)
   - 오른쪽(2) 고객센터 채팅 상담
       기업 회원 : [고객센터 채팅상담] 버튼 → 내 채팅방 (components/SupportChat)
       관리자    : 채팅방 목록 + 고른 방의 대화 (components/AdminChatConsole)
       ⚠️ 채팅은 프론트 데모 (브라우저 저장 — chatData.ts)
   - 관심 국가 설정은 맞춤 인사이트 페이지 위쪽으로 옮김
   - 회원 탈퇴 (기업 회원만) : 비밀번호 확인 → POST /api/mypage/withdraw → 성공하면 로그아웃 상태로 첫 화면
   ===================================================================== */
import { useState, type FormEvent } from 'react';
import type { User } from '../../types/user';
import { changePassword, updateMyInfo, withdrawMember } from '../../api/mypageApi';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import SupportChat from './components/SupportChat';
import AdminChatConsole from './components/AdminChatConsole';
import './MyPage.css';

interface MyPageProps {
  user: User | null;
  onUserChange: (user: User) => void;                  // 이름·주소 수정 성공 → App 의 user 도 바꿈 (헤더 동그라미 글자 등)
  onWithdrawn: () => void;                             // 탈퇴 성공 → App 이 로그인 상태를 비우고 첫 화면으로
}

// 서버 저장 실패 시 안내 문구 (본인 확인용 쿠키가 만료된 경우가 가장 흔함)
const LOGIN_EXPIRED_MESSAGE = '저장하지 못했습니다. 로그인한 지 오래되었다면 다시 로그인한 뒤 시도해 주세요.';
const SERVER_ERROR_MESSAGE = '서버 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.';

export default function MyPage({ user, onUserChange, onWithdrawn }: MyPageProps) {
  // ---------- 내 정보 수정 ----------
  const [editing, setEditing] = useState(false);       // 수정 모드인지
  const [editName, setEditName] = useState('');        // 수정 중인 이름
  const [editAddress, setEditAddress] = useState('');  // 수정 중인 주소
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');  // 저장 결과 안내
  const [infoError, setInfoError] = useState('');      // 입력 / 저장 오류 안내

  // ---------- 비밀번호 변경 ----------
  const [pwOpen, setPwOpen] = useState(false);              // 비밀번호 입력칸이 열렸는지
  const [currentPw, setCurrentPw] = useState('');           // 현재 비밀번호
  const [newPw, setNewPw] = useState('');                   // 새 비밀번호
  const [newPwConfirm, setNewPwConfirm] = useState('');     // 새 비밀번호 확인
  const [pwSaving, setPwSaving] = useState(false);          // 변경 요청 중 (버튼 잠그기)
  const [pwError, setPwError] = useState('');
  const [pwMessage, setPwMessage] = useState('');           // 변경 성공 안내

  // ---------- 회원 탈퇴 ----------
  const [withdrawOpen, setWithdrawOpen] = useState(false);       // 비밀번호 입력칸이 열렸는지
  const [withdrawPassword, setWithdrawPassword] = useState('');  // 입력한 비밀번호
  const [withdrawing, setWithdrawing] = useState(false);         // 탈퇴 요청 중 (버튼 잠그기)
  const [withdrawError, setWithdrawError] = useState('');

  const isCompany = !!user && user.role !== 'admin';   // 기업 회원(수출입기업·물류업체)인지

  // 로그인 안 했으면 안내 화면
  if (!user) {
    return (
      <div className="page-container">
        <PageHeader eyebrow="My Page" title="마이페이지" className="page-header--compact" />
        <AccessGuard icon="users" short description="마이페이지는 로그인한 회원만 이용할 수 있습니다." />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const memberId = user.memberId;

  // 내 정보 표의 줄들 { 항목 이름, 값 } — 값이 없으면 '-'
  // (이름 · 주소는 수정 모드일 때 입력칸으로 바뀜)
  const infoRows = [
    { label: '이름', value: user.name },
    { label: '이메일', value: user.email },
    { label: '기업명', value: user.companyName ?? '-' },
    { label: '회원 유형', value: isAdmin ? '관리자' : user.companyType ?? '-' },
    { label: '사업자등록번호', value: user.businessNumber ?? '-' },
    { label: '연락처', value: user.phone ?? '-' },
    { label: '주소', value: user.address ?? '-' },
  ];

  /* ---------- 입력칸 열기 · 닫기 공통 ---------- */

  // 열려 있는 입력칸 모두 닫기
  // [수정] · [변경] · [회원 탈퇴] 를 연속해서 눌러도 마지막에 누른 하나만 열려 있도록 ,
  // 각 [열기] 함수(startEdit , openPassword , openWithdraw)가 자기 칸을 열기 전에 먼저 부름
  // (함수 안에서 부르는 closePassword , closeWithdraw 는 아래에 있지만 , 버튼을 누를 때 실행되므로 문제없음)
  const closeAllForms = () => {
    closeEdit();
    closePassword();
    closeWithdraw();
  };

  /* ---------- 내 정보 수정 ---------- */

  // [취소] : 수정 모드 닫기 (입력하던 값은 다음에 [수정] 을 누를 때 지금 값으로 다시 채워짐)
  const closeEdit = () => {
    setEditing(false);
    setInfoError('');
  };

  // [수정] : 지금 값을 입력칸에 채우고 수정 모드로
  const startEdit = () => {
    closeAllForms();   // 다른 입력칸([변경] · [회원 탈퇴])은 닫기
    setEditName(user.name);
    setEditAddress(user.address ?? '');
    setInfoMessage('');
    setInfoError('');
    setEditing(true);
  };

  // [저장] : 입력값 검사 → 서버 저장 → 성공하면 App 의 user 도 새 값으로
  const saveInfo = async () => {
    const name = editName.trim();
    const address = editAddress.trim();

    if (!memberId) { setInfoError('회원 번호가 없어 수정할 수 없습니다. 다시 로그인해 주세요.'); return; }
    if (!name || name.length > 50) { setInfoError('이름은 1~50자로 입력해 주세요.'); return; }
    if (!address || address.length > 300) { setInfoError('주소는 1~300자로 입력해 주세요.'); return; }

    setInfoSaving(true);
    setInfoError('');
    try {
      const ok = await updateMyInfo(memberId, name, address);
      if (!ok) {
        setInfoError(LOGIN_EXPIRED_MESSAGE);
        return;
      }
      // 기존 user 를 복사하고 이름 · 주소만 새 값으로 (B_react 의 setForm({ ...form, name }) 과 같은 방식)
      onUserChange({ ...user, name, address });
      setEditing(false);
      setInfoMessage('내 정보가 저장되었습니다.');
    } catch (error) {
      console.log('내 정보 수정 실패 : ', error);
      setInfoError(SERVER_ERROR_MESSAGE);
    } finally {
      setInfoSaving(false);
    }
  };

  /* ---------- 비밀번호 변경 ---------- */

  // 입력칸 3개 비우기 (닫을 때 · 성공했을 때 — 비밀번호가 화면 state 에 남아 있지 않도록)
  const clearPasswordInputs = () => {
    setCurrentPw('');
    setNewPw('');
    setNewPwConfirm('');
  };

  // [변경] 버튼 : 입력칸 열기
  const openPassword = () => {
    closeAllForms();   // 다른 입력칸([수정] · [회원 탈퇴])은 닫기
    clearPasswordInputs();
    setPwError('');
    setPwMessage('');
    setPwOpen(true);
  };

  // [취소] : 입력칸 닫기
  const closePassword = () => {
    clearPasswordInputs();
    setPwError('');
    setPwOpen(false);
  };

  // [변경하기] : 화면에서 먼저 검사 → 서버에 변경 요청
  // (서버도 같은 검사를 한 번 더 함 — 화면 검사는 빠른 안내용 , 진짜로 막는 건 서버)
  const savePassword = async (event: FormEvent) => {
    event.preventDefault();   // form 기본 동작(페이지 새로고침) 막기
    setPwError('');

    // 1. 화면에서 먼저 확인 (회원가입 화면의 비밀번호 규칙과 같음 + 최대 20자)
    if (!currentPw || !newPw || !newPwConfirm) { setPwError('모든 칸을 입력해 주세요.'); return; }
    if (newPw.length < 6 || newPw.length > 20) { setPwError('새 비밀번호는\n6~20자로 입력해 주세요.'); return; }
    if (newPw !== newPwConfirm) { setPwError('새 비밀번호와 확인 칸이 서로 다릅니다.'); return; }
    if (newPw === currentPw) { setPwError('새 비밀번호가\n지금 비밀번호와 같습니다.'); return; }

    // 2. 서버에 변경 요청
    setPwSaving(true);
    try {
      const ok = await changePassword(currentPw, newPw);
      if (!ok) {
        // 실패 이유 : 현재 비밀번호가 틀렸거나 , 로그인 쿠키가 만료된 경우 (서버는 이유를 나눠 알려주지 않음)
        setPwError('현재 비밀번호가 틀렸거나\n로그인이 만료되었습니다.');
        return;
      }
      clearPasswordInputs();
      setPwOpen(false);
      setPwMessage('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.');
    } catch (error) {
      console.log('비밀번호 변경 실패 : ', error);
      setPwError('서버에 연결하지 못했습니다.');   // 버튼 왼쪽 좁은 자리에 들어가도록 짧은 문구 사용
    } finally {
      setPwSaving(false);
    }
  };

  /* ---------- 회원 탈퇴 ---------- */

  // [회원 탈퇴] 버튼 : 비밀번호 입력칸 열기
  const openWithdraw = () => {
    closeAllForms();   // 다른 입력칸([수정] · [변경])은 닫기
    setWithdrawPassword('');
    setWithdrawError('');
    setWithdrawOpen(true);
  };

  // [취소] : 입력칸 닫기 (입력한 비밀번호도 지움)
  const closeWithdraw = () => {
    setWithdrawOpen(false);
    setWithdrawPassword('');
    setWithdrawError('');
  };

  // [탈퇴하기] : 한 번 더 확인 → 서버에 탈퇴 요청 → 성공하면 App 이 로그아웃 상태로 바꾸고 첫 화면으로
  // [TS] FormEvent : form 의 onSubmit 이벤트 타입 (Enter 로도 제출되게 form 을 사용)
  const handleWithdraw = async (event: FormEvent) => {
    event.preventDefault();   // form 기본 동작(페이지 새로고침) 막기
    if (!withdrawPassword) { setWithdrawError('비밀번호를 입력해 주세요.'); return; }
    if (!window.confirm('정말 회원 탈퇴를 하시겠습니까?\n등록한 매칭 조건 · 매칭 기록 · 관심 국가가 모두 삭제되며 되돌릴 수 없습니다.')) return;

    setWithdrawing(true);
    setWithdrawError('');
    try {
      const ok = await withdrawMember(withdrawPassword);
      if (!ok) {
        // 실패 이유 : 비밀번호가 틀렸거나 , 로그인 쿠키가 만료된 경우 (서버는 이유를 나눠 알려주지 않음)
        setWithdrawError('탈퇴하지 못했습니다. 비밀번호를 확인해 주세요. 로그인한 지 오래되었다면 다시 로그인한 뒤 시도해 주세요.');
        return;
      }
      alert('회원 탈퇴가 완료되었습니다. 그동안 MACROSS 를 이용해 주셔서 감사합니다.');
      onWithdrawn();   // 서버가 쿠키는 이미 지웠으므로 , 프론트 로그인 상태만 비우면 됨
    } catch (error) {
      console.log('회원 탈퇴 실패 : ', error);
      setWithdrawError(SERVER_ERROR_MESSAGE);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="My Page"
        title="마이페이지"
        subtitle={isAdmin ? '관리자 계정' : <>{user.companyName} · {user.companyType}</>}
      />

      {/* 왼쪽(1) 내 정보 : 오른쪽(2) 고객센터 채팅 */}
      <div className="mypage-grid">
        {/* ---------- 내 정보 ---------- */}
        {/* mypage-card--info : 높이를 채팅 카드와 같게 고정 (내용이 늘어나도 옆 채팅 길이가 바뀌지 않음) */}
        <section className="mypage-card mypage-card--info">
          <div className="mypage-profile">
            <div className="mypage-profile__avatar">{user.name.charAt(0)}</div>
            <div className="mypage-profile__text">
              <p className="mypage-profile__name">{user.name}</p>
              {/* 기업명 · 회원 유형 */}
              <p className="mypage-profile__company">{user.companyName ?? '-'} · {isAdmin ? '관리자' : user.companyType}</p>
              <p className="mypage-profile__email">{user.email}</p>
            </div>
            {/* 수정 모드가 아닐 때만 [수정] 버튼 */}
            {!editing && (
              <button onClick={startEdit} className="mypage-edit-btn">수정</button>
            )}
          </div>

          <dl className="mypage-info">
            {infoRows.map((row) => (
              <div key={row.label} className="mypage-info__row">
                <dt>{row.label}</dt>
                {/* 수정 모드에서는 이름 · 주소만 입력칸으로 (나머지는 그대로 글자) */}
                {editing && row.label === '이름' && (
                  <dd><input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} className="mypage-input" /></dd>
                )}
                {editing && row.label === '주소' && (
                  <dd><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} maxLength={300} className="mypage-input" /></dd>
                )}
                {!(editing && (row.label === '이름' || row.label === '주소')) && <dd>{row.value}</dd>}
              </div>
            ))}
          </dl>

          {/* ---------- 비밀번호 변경 (정보 목록 바로 아래 한 줄) ----------
              [변경] 을 누르면 같은 줄에서 바로 "현재 비밀번호" 입력이 시작되고 , 그 아래로 새 비밀번호 · 확인이 한 줄씩 (총 3줄)
              → 늘어나는 높이를 줄여서 카드(600px) 안에 들어감 (옆의 고객센터 채팅 길이가 바뀌지 않음)
              전체를 form 으로 감싸서 어느 칸에서든 Enter 로 제출 */}
          <form onSubmit={savePassword} className="mypage-password">
            <div className="mypage-password__row">
              <span className="mypage-password__label">비밀번호</span>
              {pwOpen ? (
                // autoComplete : 브라우저가 비밀번호를 알맞게 채우거나 저장하도록 알려 주는 표시
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" autoFocus className="mypage-password__input mypage-password__input--current" />
              ) : (
                // 비밀번호 자체는 보여 줄 수 없어서 ●●●● 로 표시
                // type="button" : form 안의 버튼은 기본이 제출(submit)이라 , 누르면 제출되지 않도록 표시
                <span className="mypage-password__value">
                  ●●●●●●●●
                  <button type="button" onClick={openPassword} className="mypage-edit-btn">변경</button>
                </span>
              )}
            </div>

            {/* 새 비밀번호 , 새 비밀번호 확인 (한 줄에 하나씩 , 현재 비밀번호 칸과 같은 크기) + [취소] [변경하기] */}
            {pwOpen && (
              <>
                <div className="mypage-password__new">
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (6~20자)" maxLength={20} autoComplete="new-password" className="mypage-password__input" />
                  <input type="password" value={newPwConfirm} onChange={(e) => setNewPwConfirm(e.target.value)} placeholder="새 비밀번호 확인" maxLength={20} autoComplete="new-password" className="mypage-password__input" />
                </div>
                {/* 버튼 줄 : 왼쪽 빈자리에 오류 문구 , 오른쪽에 [취소] [변경하기]
                    (오류 문구를 버튼 아래가 아니라 옆에 두어서 , 문구가 생겨도 높이가 늘어나지 않음) */}
                <div className="mypage-password__actions">
                  <p className="mypage-password__error">{pwError}</p>
                  <button type="button" onClick={closePassword} disabled={pwSaving} className="mypage-cancel-btn">취소</button>
                  <button type="submit" disabled={pwSaving} className="mypage-save-btn">
                    {pwSaving ? '변경 중...' : '변경하기'}
                  </button>
                </div>
              </>
            )}
            {/* 변경 성공 안내 (입력칸이 닫힌 뒤 비밀번호 줄 아래에 표시) */}
            {pwMessage && <p className="mypage-notice">{pwMessage}</p>}
          </form>

          {infoError && <p className="mypage-error">{infoError}</p>}
          {infoMessage && <p className="mypage-notice">{infoMessage}</p>}

          {/* 수정 모드 : [취소] [저장] */}
          {editing && (
            <div className="mypage-edit-actions">
              <button onClick={closeEdit} disabled={infoSaving} className="mypage-cancel-btn">취소</button>
              <button onClick={saveInfo} disabled={infoSaving} className="mypage-save-btn">
                {infoSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

        </section>

        {/* ---------- 고객센터 채팅 상담 ---------- */}
        {/* key : 다른 회원으로 바뀌면 채팅 화면을 새로 그림 (열려 있던 채팅창 닫힘) */}
        {isCompany
          ? <SupportChat key={user.memberId ?? user.email} user={user} />
          : <AdminChatConsole />}
      </div>

      {/* ---------- 회원 탈퇴 (기업 회원만) ---------- */}
      {isCompany && (
        <section className="mypage-withdraw">
          <div className="mypage-withdraw__row">
            <div>
              <p className="mypage-withdraw__title">회원 탈퇴</p>
              <p className="mypage-withdraw__desc">탈퇴하면 계정 · 매칭 조건 · 매칭 기록 · 관심 국가가 모두 삭제되며 되돌릴 수 없습니다.</p>
            </div>
            {/* 오른쪽 : 닫혀 있으면 [회원 탈퇴] 버튼 , 누르면 그 자리에 [비밀번호 입력창] [취소] [탈퇴하기] (Enter 로도 제출) */}
            {withdrawOpen ? (
              <form onSubmit={handleWithdraw} className="mypage-withdraw__form">
                <input
                  type="password"
                  value={withdrawPassword}
                  onChange={(e) => setWithdrawPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  autoFocus
                  className="mypage-withdraw__input"
                />
                <button type="button" onClick={closeWithdraw} disabled={withdrawing} className="mypage-cancel-btn">취소</button>
                <button type="submit" disabled={withdrawing} className="mypage-withdraw__btn">
                  {withdrawing ? '탈퇴 처리 중...' : '탈퇴하기'}
                </button>
              </form>
            ) : (
              <button onClick={openWithdraw} className="mypage-withdraw__btn">회원 탈퇴</button>
            )}
          </div>
          {withdrawError && <p className="mypage-error">{withdrawError}</p>}
        </section>
      )}
    </div>
  );
}
