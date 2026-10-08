/* =====================================================================
   마이페이지 (주소: /mypage , 로그인한 회원 — 헤더 오른쪽 동그라미 버튼으로 들어옴)
   - 왼쪽(1) 내 정보 : 로그인할 때 받은 회원 정보 표시 + 이름 · 주소 수정 (PUT /api/mypage/{memberId})
   - 오른쪽(2) 고객센터 채팅 상담
       기업 회원 : [고객센터 채팅상담] 버튼 → 내 채팅방 (components/SupportChat)
       관리자    : 채팅방 목록 + 고른 방의 대화 (components/AdminChatConsole)
       ⚠️ 채팅은 프론트 데모 (브라우저 저장 — chatData.ts)
   - 관심 국가 설정은 맞춤 인사이트 페이지 위쪽으로 옮김
   - 회원 탈퇴 버튼 (기업 회원만, 실제 탈퇴 API 는 로그인 담당 팀원이 만들면 연결)
   ===================================================================== */
import { useState } from 'react';
import type { User } from '../../types/user';
import { updateMyInfo } from '../../api/mypageApi';
import PageHeader from '../../components/common/PageHeader';
import AccessGuard from '../../components/common/AccessGuard';
import SupportChat from './components/SupportChat';
import AdminChatConsole from './components/AdminChatConsole';
import './MyPage.css';

interface MyPageProps {
  user: User | null;
  onUserChange: (user: User) => void;                  // 이름·주소 수정 성공 → App 의 user 도 바꿈 (헤더 동그라미 글자 등)
}

// 서버 저장 실패 시 안내 문구 (본인 확인용 쿠키가 만료된 경우가 가장 흔함)
const LOGIN_EXPIRED_MESSAGE = '저장하지 못했습니다. 로그인한 지 오래되었다면 다시 로그인한 뒤 시도해 주세요.';
const SERVER_ERROR_MESSAGE = '서버 요청에 실패했습니다. Spring 서버(8080) 실행 상태를 확인해 주세요.';

export default function MyPage({ user, onUserChange }: MyPageProps) {
  // ---------- 내 정보 수정 ----------
  const [editing, setEditing] = useState(false);       // 수정 모드인지
  const [editName, setEditName] = useState('');        // 수정 중인 이름
  const [editAddress, setEditAddress] = useState('');  // 수정 중인 주소
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');  // 저장 결과 안내
  const [infoError, setInfoError] = useState('');      // 입력 / 저장 오류 안내

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

  /* ---------- 내 정보 수정 ---------- */

  // [수정] : 지금 값을 입력칸에 채우고 수정 모드로
  const startEdit = () => {
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

  // 회원 탈퇴 버튼
  const handleWithdraw = () => {
    if (!window.confirm('정말 회원 탈퇴를 하시겠습니까?\n탈퇴하면 등록한 매칭 조건과 매칭 기록을 더 이상 이용할 수 없습니다.')) return;
    // TODO: 로그인 담당 팀원이 회원 탈퇴 API 를 만들면 여기서 호출하고, 성공하면 로그아웃 처리
    //       예) const response = await axios.delete(`/api/member/${user.memberId}`);
    alert('회원 탈퇴 기능은 준비 중입니다.');
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
        <section className="mypage-card">
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

          {infoError && <p className="mypage-error">{infoError}</p>}
          {infoMessage && <p className="mypage-notice">{infoMessage}</p>}

          {/* 수정 모드 : [취소] [저장] */}
          {editing && (
            <div className="mypage-edit-actions">
              <button onClick={() => { setEditing(false); setInfoError(''); }} disabled={infoSaving} className="mypage-cancel-btn">취소</button>
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
          <div>
            <p className="mypage-withdraw__title">회원 탈퇴</p>
            <p className="mypage-withdraw__desc">탈퇴하면 계정과 매칭 정보를 더 이상 이용할 수 없습니다.</p>
          </div>
          <button onClick={handleWithdraw} className="mypage-withdraw__btn">회원 탈퇴</button>
        </section>
      )}
    </div>
  );
}
