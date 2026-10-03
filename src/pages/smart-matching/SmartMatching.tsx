import { useEffect, useState } from 'react';
import type { User } from '../../types/user';
import AccessGuard from '../../components/common/AccessGuard';
import PageHeader from '../../components/common/PageHeader';
import MatchStats from './components/MatchStats';
import MatchCard from './components/MatchCard';
import RejectReasonModal from './components/RejectReasonModal';
import { loadMatchItems } from './matchMapper';
import type { MatchItem, PartyKey, PartyResponse, StatusFilter } from './matchTypes';
import './SmartMatching.css';

interface SmartMatchingProps {
  user: User | null;
  onLoginClick: () => void;
}

export default function SmartMatching({ user, onLoginClick }: SmartMatchingProps) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rejectModalId, setRejectModalId] = useState<{ matchId: number; party: PartyKey } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminRejectModalId, setAdminRejectModalId] = useState<number | null>(null);
  const [adminRejectReason, setAdminRejectReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // DB에 저장된 매칭 결과를 불러오기 (관리자만)
  useEffect(() => {
    const controller = new AbortController();

    if (!user || user.role !== 'admin') {
      setMatches([]);
      return () => controller.abort();
    }

    loadMatchItems(controller.signal)
      .then((rows) => {
        if (rows && !controller.signal.aborted) setMatches(rows);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.log('매칭 결과 조회 실패 : ', error);
        setMatches([]);
      });

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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  /* ---------- 관리자 승인 / 반려 ---------- */
  // TODO: 백엔드 연결 시 승인/반려 API 호출 추가 (현재는 화면 상태만 변경)
  const approveByAdmin = (id: number) => {
    setMatches((p) => p.map((m) => (m.id === id ? { ...m, adminStatus: 'approved' } : m)));
    showToast('✓ 매칭 승인 완료. 화주사 및 물류업체에 알림이 발송되었습니다.');
  };

  const rejectByAdmin = (id: number) => {
    setMatches((p) => p.map((m) => (m.id === id ? { ...m, adminStatus: 'rejected', adminRejectReason } : m)));
    setAdminRejectModalId(null);
    setAdminRejectReason('');
    showToast('매칭이 반려되었습니다.');
  };

  /* ---------- 화주사 / 물류업체 수락·거절 ---------- */
  const respondAsParty = (matchId: number, party: PartyKey, response: PartyResponse, reason?: string) => {
    setMatches((p) => p.map((m) => {
      if (m.id !== matchId) return m;
      const updated = { ...m, [party]: { ...m[party], response, rejectReason: reason } };
      const shipperAccepted = party === 'shipper' ? response === 'accepted' : m.shipper.response === 'accepted';
      const logisticsAccepted = party === 'logistics' ? response === 'accepted' : m.logistics.response === 'accepted';
      const shipperRejected = party === 'shipper' ? response === 'rejected' : m.shipper.response === 'rejected';
      const logisticsRejected = party === 'logistics' ? response === 'rejected' : m.logistics.response === 'rejected';
      if (shipperAccepted && logisticsAccepted) updated.finalStatus = 'completed';
      else if (shipperRejected || logisticsRejected) updated.finalStatus = 'failed';
      return updated;
    }));
    if (response === 'rejected') {
      setRejectModalId(null);
      setRejectReason('');
    }
  };

  /* ---------- 상태 필터 ---------- */
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
            onToggle={() => setExpandedId(expandedId === match.id ? null : match.id)}
            onApprove={() => approveByAdmin(match.id)}
            onAdminReject={() => setAdminRejectModalId(match.id)}
            onPartyAccept={(party) => respondAsParty(match.id, party, 'accepted')}
            onPartyReject={(party) => setRejectModalId({ matchId: match.id, party })}
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
          onConfirm={() => adminRejectModalId && rejectByAdmin(adminRejectModalId)}
        />
      )}

      {/* 화주사/물류업체 거절 모달 */}
      {rejectModalId !== null && (
        <RejectReasonModal
          title={<>{rejectModalId.party === 'shipper' ? '화주사' : '물류업체'} 거절</>}
          description="거절 사유를 선택하세요"
          confirmLabel="거절 확인"
          selected={rejectReason}
          onSelect={setRejectReason}
          onCancel={() => { setRejectModalId(null); setRejectReason(''); }}
          onConfirm={() => rejectModalId && respondAsParty(rejectModalId.matchId, rejectModalId.party, 'rejected', rejectReason)}
        />
      )}
    </div>
  );
}
