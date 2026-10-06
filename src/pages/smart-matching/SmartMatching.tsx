/* =====================================================================
   매칭 관리 페이지 (주소: /matching , 관리자 전용)
   - DB 에 저장된 매칭 결과를 카드 목록으로 보여주고, 관리자가 승인 / 반려
   - 데이터 준비(여러 API 조회 + 화면용 변환)는 matchMapper.ts 가 담당
   ===================================================================== */
import { useEffect, useState } from 'react';
import type { User } from '../../types/user';
import AccessGuard from '../../components/common/AccessGuard';
import PageHeader from '../../components/common/PageHeader';
import MatchStats from './components/MatchStats';
import MatchCard from './components/MatchCard';
import RejectReasonModal from './components/RejectReasonModal';
import { loadMatchItems } from './matchMapper';
import type { MatchItem, StatusFilter } from './matchTypes';
import './SmartMatching.css';
import axios from 'axios';

// [TS] 이 컴포넌트가 받는 props 의 모양 (가이드 2-4)
interface SmartMatchingProps {
  user: User | null;          // 로그인 안 했으면 null
  onLoginClick: () => void;   // [TS] () => void : "아무것도 안 받고 아무것도 안 돌려주는 함수"
}

export default function SmartMatching({ user, onLoginClick }: SmartMatchingProps) {
  const [matches, setMatches] = useState<MatchItem[]>([]);                // 매칭 카드 목록
  const [expandedId, setExpandedId] = useState<number | null>(null);      // 펼쳐진 카드 id (없으면 null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');  // 상단 상태 카드에서 고른 필터


  const [adminRejectModalId, setAdminRejectModalId] = useState<number | null>(null);  // 반려 모달을 띄운 매칭 id
  const [adminRejectReason, setAdminRejectReason] = useState('');                     // 모달에서 고른 반려 사유
  const [toast, setToast] = useState<string | null>(null);                            // 잠깐 떴다 사라지는 알림 글자

  // DB에 저장된 매칭 결과를 불러오기 (관리자만)
  useEffect(() => {
    // AbortController : 페이지를 떠나면 진행 중인 요청을 취소하는 도구 (가이드 3-4)
    const controller = new AbortController();

    if (!user || user.role !== 'admin') {
      setMatches([]);
      return () => controller.abort();
    }

    const fetchMatches = async () => {
      try {
        const rows = await loadMatchItems(controller.signal);
        // 취소되지 않았을 때만 화면에 반영 (이미 페이지를 떠났으면 무시)
        if (rows && !controller.signal.aborted) setMatches(rows);
      } catch (error) {
        if (controller.signal.aborted) return;   // 취소해서 난 오류는 무시
        console.log('매칭 결과 조회 실패 : ', error);
        setMatches([]);
      }
    };

    fetchMatches();

    // 정리 함수 : 페이지를 떠나거나 user 가 바뀌면 이전 요청 취소
    return () => controller.abort();
  }, [user]);

  // 관리자만 접근 가능
  if (!user || user.role !== 'admin') {
    return (
      <div className="page-container">
        <PageHeader eyebrow="Admin" title="매칭 관리" className="page-header--compact" />
        <AccessGuard
          icon="lock"
          title="관리자 전용 메뉴"
          description="관리자 계정으로만 접근 가능합니다."
          buttonLabel="관리자로 로그인"
          onLoginClick={onLoginClick}
        />
      </div>
    );
  }

  // 알림 글자를 띄우고 4초(4000ms) 뒤에 자동으로 지우기
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  /* ---------- 관리자 승인 / 반려 ---------- */
  const approveByAdmin = async (id: number) => {

    try {

      const response = await axios.post(
        `/api/matching/approve/${id}`
      );

      if (response.data === true) {

        // DB 저장 성공 후 화면 상태 변경
        // map 으로 목록을 새로 만들면서, 승인한 카드(id 가 같은 것)만 adminStatus 를 바꿈
        setMatches((p) =>
          p.map((m) =>
            m.id === id
              ? { ...m, adminStatus: 'approved' }
              : m
          )
        );

        showToast('✓ 매칭이 승인되었습니다.');

      } else {

        showToast('매칭 승인에 실패했습니다.');

      }

    } catch (error) {

      console.log('매칭 승인 실패 : ', error);
      showToast('매칭 승인 중 오류가 발생했습니다.');

    }

  };


  // 관리자 매칭 반려
  const rejectByAdmin = async (id: number) => {

    try {

      const response = await axios.post(
        `/api/matching/reject/${id}`
      );

      if (response.data === true) {

        // DB 저장 성공 후 화면 상태 변경
        setMatches((p) =>
          p.map((m) =>
            m.id === id
              ? {
                  ...m,
                  adminStatus: 'rejected',
                  finalStatus: 'failed',
                  adminRejectReason: adminRejectReason
                }
              : m
          )
        );

        // 모달 닫고 고른 사유 초기화
        setAdminRejectModalId(null);
        setAdminRejectReason('');

        showToast('매칭이 반려되었습니다.');

      } else {

        showToast('매칭 반려에 실패했습니다.');

      }

    } catch (error) {

      console.log('매칭 반려 실패 : ', error);
      showToast('매칭 반려 중 오류가 발생했습니다.');

    }

  };


  /* ---------- 상태 필터 ---------- */
  // filter : 조건이 true 인 카드만 남긴 새 배열 (가이드 4)
  const filteredMatches = matches.filter((m) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return m.adminStatus === 'pending' && m.finalStatus === 'pending';
    if (statusFilter === 'approved') return m.adminStatus === 'approved' && m.finalStatus === 'pending';
    if (statusFilter === 'completed') return m.finalStatus === 'completed';
    if (statusFilter === 'failed') return m.finalStatus === 'failed';
    return false;
  });

  return (
    <div className="page-container">
      {/* 알림 토스트 */}
      {toast && <div className="sm-toast">{toast}</div>}

      {/* 제목 */}
      <div className="page-header sm-header">
        <div>
          <p className="eyebrow">Admin · AI Matching</p>
          <h1 className="page-title">매칭 관리</h1>
        </div>
      </div>

      {/* 상태별 개수 */}
      <MatchStats matches={matches} filter={statusFilter} onFilterChange={setStatusFilter} />

      <div className="sm-separator" />

      {/* 매칭 카드 목록 */}
      <div className="sm-list">
        {filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            expanded={expandedId === match.id}
            // 이미 펼친 카드를 다시 누르면 접기(null), 아니면 이 카드 펼치기
            onToggle={() => setExpandedId(expandedId === match.id ? null : match.id)}
            onApprove={() => approveByAdmin(match.id)}
            onAdminReject={() => setAdminRejectModalId(match.id)}

          />
        ))}

        {filteredMatches.length === 0 && (
          <div className="sm-empty">
            <p>해당 상태의 매칭 건이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 관리자 반려 모달 */}
      {adminRejectModalId !== null && (
        <RejectReasonModal
          title="매칭 반려"
          description="반려 사유를 선택하세요"
          confirmLabel="반려 확인"
          selected={adminRejectReason}
          onSelect={setAdminRejectReason}
          onCancel={() => { setAdminRejectModalId(null); setAdminRejectReason(''); }}
          onConfirm={() => {
            if (adminRejectModalId) rejectByAdmin(adminRejectModalId);
          }}
        />
      )}


    </div>
  );
}
