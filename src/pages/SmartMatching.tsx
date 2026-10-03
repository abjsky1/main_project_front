import { useEffect, useState } from 'react';
import axios from 'axios';

import type { User } from '../App';



interface SmartMatchingProps {

  user: User | null;

  onLoginClick: () => void;

}



type AdminStatus = 'pending' | 'approved' | 'rejected';

type PartyResponse = 'waiting' | 'accepted' | 'rejected';

type FinalStatus = 'pending' | 'completed' | 'failed';



interface Party {

  companyName: string;

  contactName: string;

  bizNumber: string;

  phone: string;

  address: string;

  response: PartyResponse;

  rejectReason?: string;

}



interface MatchRequest {

  country: string; hsCode: string; tradeType: '수출' | '수입'; transport: '해상' | '항공';

  departure: string; destination: string; volume: number; schedule: string;

  cargoType: '일반' | '특수'; refrigeration: boolean; hazmat: boolean; heavy: boolean; special: boolean;

}



interface LogisticsOffer {

  country: string; transport: 'SEA' | 'AIR'; departure: string; destination: string;

  regularRoute: boolean; directRoute: boolean; leadTime: number; availableDate: string;

  availableCapacity: number; general: boolean; refrigeration: boolean; hazmat: boolean; heavy: boolean; special: boolean;

  hsCode: string; experience: number;

}



interface MatchItem {

  id: number;

  createdAt: string;



  routeScore: number;

  capacityScore: number;

  itemScore: number;

  scheduleScore: number;

  experienceScore: number;

  totalScore: number;



  matchFactors: string[];



  adminStatus: AdminStatus;

  adminRejectReason?: string;

  finalStatus: FinalStatus;



  shipper: Party;

  logistics: Party;

  request: MatchRequest;

  offer: LogisticsOffer;

}



const REJECT_REASONS = ['일정 불일치', '물량 초과', '노선 변경 불가', '단가 협의 실패', '서비스 조건 불일치', '기타 사유'];



// 백엔드 GET /api/matching 응답
interface MatchingApiDto {
  matchingId: number;
  cscore1Id: number;
  lscore1Id: number;

  routeScore: number;
  capacityScore: number;
  itemScore: number;
  scheduleScore: number;
  experienceScore: number;
  totalScore: number;

  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  shipperStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';
  logisticsStatus: 'WAITING' | 'ACCEPTED' | 'REJECTED';
  finalStatus: 'PENDING' | 'COMPLETED' | 'FAILED';

  recommendReason: string;
  warningMessage: string;
  createdAt: string;

  // 추후 MatchingDto에 회원 상세 필드를 추가하면 바로 사용할 수 있도록 optional 처리
  shipperCompanyName?: string;
  shipperContactName?: string;
  shipperBizNumber?: string;
  shipperPhone?: string;
  shipperAddress?: string;

  logisticsCompanyName?: string;
  logisticsContactName?: string;
  logisticsBizNumber?: string;
  logisticsPhone?: string;
  logisticsAddress?: string;
}

interface Score1Dto {
  memberId: string;
  countryId: number;
  hsCode: string;
  tradeType: boolean;
  transportType: boolean;
  departure: number;
  arrival: number;
  matchingAgree: boolean;
}

interface Cscore1Dto extends Score1Dto {
  cscore1Id: number;
}

interface Lscore1Dto extends Score1Dto {
  lscore1Id: number;
  experienceCount: number;
  regularRoute: boolean;
  directRoute: boolean;
}

interface Cscore2Dto {
  requestWeight: number;
  desiredDate: string;
}

interface Lscore2Dto {
  availableCapacity: number;
  availableDate: string;
  averageTransitDays: number;
}

interface CargoDto {
  generalContainer: boolean;
  refrigerated: boolean;
  dangerous: boolean;
  heavyCargo: boolean;
  specialCargo: boolean;
}

interface CountryData {
  countryId: number;
  countryName: string;
}

interface RouteData {
  routeId: number;
  countryId: number;
  transportType: number;
  routeName: string;
}

function parseCountryCsv(csv: string): CountryData[] {
  const result: CountryData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [countryId, _countryCode, _currencyId, ...nameParts] = line.split(',');

    result.push({
      countryId: Number(countryId),
      countryName: nameParts.join(',').trim(),
    });
  }

  return result;
}

function parseRouteCsv(csv: string): RouteData[] {
  const result: RouteData[] = [];
  const lines = csv.trim().split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    const [routeId, countryId, transportType, ...nameParts] = line.split(',');

    result.push({
      routeId: Number(routeId),
      countryId: Number(countryId),
      transportType: Number(transportType),
      routeName: nameParts.join(',').trim(),
    });
  }

  return result;
}

function getCountryName(countries: CountryData[], countryId: number) {
  const country = countries.find((item) => item.countryId === countryId);
  return country ? country.countryName : `국가 #${countryId}`;
}

function getRouteName(routes: RouteData[], routeId: number) {
  const route = routes.find((item) => item.routeId === routeId);
  return route ? route.routeName : `경로 #${routeId}`;
}

function toAdminStatus(status: MatchingApiDto['adminStatus']): AdminStatus {
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}

function toPartyResponse(status: MatchingApiDto['shipperStatus']): PartyResponse {
  if (status === 'ACCEPTED') return 'accepted';
  if (status === 'REJECTED') return 'rejected';
  return 'waiting';
}

function toFinalStatus(status: MatchingApiDto['finalStatus']): FinalStatus {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FAILED') return 'failed';
  return 'pending';
}

function shortMemberId(memberId: string) {
  if (!memberId) return '-';
  return memberId.length > 8 ? `${memberId.slice(0, 8)}…` : memberId;
}

function makeMatchFactors(
  cscore1: Cscore1Dto,
  cscore2: Cscore2Dto,
  cscore3: CargoDto,
  lscore1: Lscore1Dto,
  lscore2: Lscore2Dto,
  countryName: string,
): string[] {
  const factors: string[] = [];

  factors.push(
    cscore1.hsCode === lscore1.hsCode
      ? `HS코드 일치 (${cscore1.hsCode})`
      : `HS코드 적합도 반영 (${cscore1.hsCode} ↔ ${lscore1.hsCode})`
  );

  factors.push(`서비스 국가 일치 (${countryName})`);
  factors.push(`운송방식 일치 (${cscore1.transportType ? '해상' : '항공'})`);
  factors.push(`물량 가용 (${cscore2.requestWeight}t / ${lscore2.availableCapacity}t)`);
  factors.push(`일정 비교 (${cscore2.desiredDate} ↔ ${lscore2.availableDate})`);

  if (cscore3.refrigerated) factors.push('냉장/냉동 취급 가능');
  if (cscore3.dangerous) factors.push('위험물 취급 가능');
  if (cscore3.heavyCargo) factors.push('중량물 취급 가능');
  if (cscore3.specialCargo) factors.push('특수화물 취급 가능');

  return factors;
}



function AdminGuard({ onLoginClick }: { onLoginClick: () => void }) {

  return (

    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">

      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(100,50,220,0.07)' }}>

        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5">

          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>

        </svg>

      </div>

      <div className="text-center">

        <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>관리자 전용 메뉴</h2>

        <p className="text-sm mt-1" style={{ color: '#9090a8' }}>관리자 계정으로만 접근 가능합니다.</p>

      </div>

      <button onClick={onLoginClick} className="px-6 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>관리자로 로그인</button>

    </div>

  );

}



const BoolBadge = ({ val }: { val: boolean }) =>

  val ? <span className="font-bold" style={{ color: '#1a9e5c' }}>O</span> : <span style={{ color: '#d93025' }}>X</span>;



const MatchBadge = ({ match }: { match: boolean | null }) =>

  match === null ? <span style={{ color: '#9090a8' }}>–</span> :

  match ? <span style={{ color: '#1a9e5c', fontSize: 12 }}>✓ 일치</span> : <span style={{ color: '#f59e0b', fontSize: 12 }}>⚠ 부분</span>;



export default function SmartMatching({ user, onLoginClick }: SmartMatchingProps) {

  const [matches, setMatches] = useState<MatchItem[]>([]);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | AdminStatus | 'completed' | 'failed'>('all');

  const [rejectModalId, setRejectModalId] = useState<{ matchId: number; party: 'shipper' | 'logistics' } | null>(null);

  const [rejectReason, setRejectReason] = useState('');

  const [adminRejectModalId, setAdminRejectModalId] = useState<number | null>(null);

  const [adminRejectReason, setAdminRejectReason] = useState('');

  const [toast, setToast] = useState<string | null>(null);

  // DB에 저장된 매칭 결과를 기존 MatchItem UI 구조로 변환해서 불러오기
  useEffect(() => {
    const controller = new AbortController();

    if (!user || user.role !== 'admin') {
      setMatches([]);
      return () => controller.abort();
    }

    const loadMatches = async () => {
      try {
        // 1. 매칭 + Cscore1 + Lscore1 + CSV 기준정보 전체 조회
        const [matchingRes, cscore1Res, lscore1Res, countryRes, routeRes] = await Promise.all([
          axios.get<MatchingApiDto[]>('/api/matching', { signal: controller.signal }),
          axios.get<Cscore1Dto[]>('/api/cscore', { signal: controller.signal }),
          axios.get<Lscore1Dto[]>('/api/lscore', { signal: controller.signal }),
          axios.get<string>('/country/country.csv', { responseType: 'text', signal: controller.signal }),
          axios.get<string>('/route/route.csv', { responseType: 'text', signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        const countries = parseCountryCsv(countryRes.data);
        const routes = parseRouteCsv(routeRes.data);

        const rows = await Promise.all(
          matchingRes.data.map(async (matching): Promise<MatchItem | null> => {
            const cscore1 = cscore1Res.data.find(
              (item) => item.cscore1Id === matching.cscore1Id
            );

            const lscore1 = lscore1Res.data.find(
              (item) => item.lscore1Id === matching.lscore1Id
            );

            if (!cscore1 || !lscore1) {
              console.log('매칭 조건 1번 정보가 없습니다.', matching);
              return null;
            }

            // 2. 선택된 매칭의 Cscore2/3, Lscore2/3 상세 조회
            const [cscore2Res, cscore3Res, lscore2Res, lscore3Res] = await Promise.all([
              axios.get<Cscore2Dto | null>(
                `/api/cscore/${matching.cscore1Id}/cscore2`,
                { signal: controller.signal }
              ),
              axios.get<CargoDto | null>(
                `/api/cscore/${matching.cscore1Id}/cscore3`,
                { signal: controller.signal }
              ),
              axios.get<Lscore2Dto | null>(
                `/api/lscore/${matching.lscore1Id}/lscore2`,
                { signal: controller.signal }
              ),
              axios.get<CargoDto | null>(
                `/api/lscore/${matching.lscore1Id}/lscore3`,
                { signal: controller.signal }
              ),
            ]);

            const cscore2 = cscore2Res.data;
            const cscore3 = cscore3Res.data;
            const lscore2 = lscore2Res.data;
            const lscore3 = lscore3Res.data;

            if (!cscore2 || !cscore3 || !lscore2 || !lscore3) {
              console.log('매칭 조건 2/3번 상세 정보가 없습니다.', matching);
              return null;
            }

            const countryName = getCountryName(countries, cscore1.countryId);

            // 3. 원래 SmartMatching UI에서 사용하는 MatchItem 구조로 변환
            return {
              id: matching.matchingId,
              createdAt: matching.createdAt
                ? matching.createdAt.replace('T', ' ').slice(0, 16)
                : '-',

              routeScore: matching.routeScore,
              capacityScore: matching.capacityScore,
              itemScore: matching.itemScore,
              scheduleScore: matching.scheduleScore,
              experienceScore: matching.experienceScore,
              totalScore: matching.totalScore,

              matchFactors: makeMatchFactors(
                cscore1,
                cscore2,
                cscore3,
                lscore1,
                lscore2,
                countryName,
              ),

              adminStatus: toAdminStatus(matching.adminStatus),
              adminRejectReason:
                matching.adminStatus === 'REJECTED' &&
                matching.warningMessage &&
                matching.warningMessage !== '-'
                  ? matching.warningMessage
                  : undefined,
              finalStatus: toFinalStatus(matching.finalStatus),

              shipper: {
                companyName:
                  matching.shipperCompanyName ??
                  `수출입기업 (${shortMemberId(cscore1.memberId)})`,
                contactName: matching.shipperContactName ?? '-',
                bizNumber: matching.shipperBizNumber ?? '-',
                phone: matching.shipperPhone ?? '-',
                address: matching.shipperAddress ?? '-',
                response: toPartyResponse(matching.shipperStatus),
              },

              logistics: {
                companyName:
                  matching.logisticsCompanyName ??
                  `물류기업 (${shortMemberId(lscore1.memberId)})`,
                contactName: matching.logisticsContactName ?? '-',
                bizNumber: matching.logisticsBizNumber ?? '-',
                phone: matching.logisticsPhone ?? '-',
                address: matching.logisticsAddress ?? '-',
                response: toPartyResponse(matching.logisticsStatus),
              },

              request: {
                country: countryName,
                hsCode: cscore1.hsCode,
                tradeType: cscore1.tradeType ? '수출' : '수입',
                transport: cscore1.transportType ? '해상' : '항공',
                departure: getRouteName(routes, cscore1.departure),
                destination: getRouteName(routes, cscore1.arrival),
                volume: cscore2.requestWeight,
                schedule: cscore2.desiredDate,
                cargoType: cscore3.generalContainer ? '일반' : '특수',
                refrigeration: cscore3.refrigerated,
                hazmat: cscore3.dangerous,
                heavy: cscore3.heavyCargo,
                special: cscore3.specialCargo,
              },

              offer: {
                country: getCountryName(countries, lscore1.countryId),
                transport: lscore1.transportType ? 'SEA' : 'AIR',
                departure: getRouteName(routes, lscore1.departure),
                destination: getRouteName(routes, lscore1.arrival),
                regularRoute: lscore1.regularRoute,
                directRoute: lscore1.directRoute,
                leadTime: lscore2.averageTransitDays,
                availableDate: lscore2.availableDate,
                availableCapacity: lscore2.availableCapacity,
                general: lscore3.generalContainer,
                refrigeration: lscore3.refrigerated,
                hazmat: lscore3.dangerous,
                heavy: lscore3.heavyCargo,
                special: lscore3.specialCargo,
                hsCode: lscore1.hsCode,
                experience: lscore1.experienceCount,
              },
            };
          })
        );

        if (controller.signal.aborted) return;

        const validRows = rows.filter((row): row is MatchItem => row !== null);
        setMatches(validRows);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.log('매칭 결과 조회 실패 : ', error);
        setMatches([]);
      }
    };

    void loadMatches();

    return () => controller.abort();
  }, [user]);




  if (!user || user.role !== 'admin') {

    return (

      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="mb-7">

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Admin</p>

          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>매칭 관리</h1>

        </div>

        <AdminGuard onLoginClick={onLoginClick} />

      </div>

    );

  }



  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };



  const approveByAdmin = (id: number) => {

    setMatches((p) => p.map((m) => m.id === id ? { ...m, adminStatus: 'approved' } : m));

    showToast('✓ 매칭 승인 완료. 화주사 및 물류업체에 알림이 발송되었습니다.');

  };



  const rejectByAdmin = (id: number) => {

    setMatches((p) => p.map((m) => m.id === id ? { ...m, adminStatus: 'rejected', adminRejectReason: adminRejectReason } : m));

    setAdminRejectModalId(null);

    setAdminRejectReason('');

    showToast('매칭이 반려되었습니다.');

  };



  const respondAsParty = (matchId: number, party: 'shipper' | 'logistics', response: PartyResponse, reason?: string) => {

    setMatches((p) => p.map((m) => {

      if (m.id !== matchId) return m;

      const updated = { ...m, [party]: { ...m[party], response, rejectReason: reason } };

      const shipperAccepted = (party === 'shipper' ? response === 'accepted' : m.shipper.response === 'accepted');

      const logisticsAccepted = (party === 'logistics' ? response === 'accepted' : m.logistics.response === 'accepted');

      const shipperRejected = (party === 'shipper' ? response === 'rejected' : m.shipper.response === 'rejected');

      const logisticsRejected = (party === 'logistics' ? response === 'rejected' : m.logistics.response === 'rejected');

      if (shipperAccepted && logisticsAccepted) updated.finalStatus = 'completed';

      else if (shipperRejected || logisticsRejected) updated.finalStatus = 'failed';

      return updated;

    }));

    if (response === 'rejected') {

      setRejectModalId(null);

      setRejectReason('');

    }

  };



const filteredMatches = matches.filter((m) => {

  if (statusFilter === 'all') return true;

  if (statusFilter === 'pending') {

    return m.adminStatus === 'pending'

      && m.finalStatus === 'pending';

  }

  if (statusFilter === 'approved') {

    return m.adminStatus === 'approved'

      && m.finalStatus === 'pending';

  }

  if (statusFilter === 'completed') {

    return m.finalStatus === 'completed';

  }

  if (statusFilter === 'failed') {

    return m.finalStatus === 'failed';

  }

  return false;

  });



  const counts = {

    all: matches.length,

    pending: matches.filter((m) => m.adminStatus === 'pending').length,

    approved: matches.filter((m) => m.adminStatus === 'approved' && m.finalStatus === 'pending').length,

    completed: matches.filter((m) => m.finalStatus === 'completed').length,

    failed: matches.filter((m) => m.finalStatus === 'failed').length,

  };



  const statusBadge = (m: MatchItem) => {

    if (m.finalStatus === 'completed') return { label: '매칭 성사', bg: '#dcfce7', color: '#166534' };

    if (m.finalStatus === 'failed') return { label: '매칭 실패', bg: '#fee2e2', color: '#991b1b' };

    if (m.adminStatus === 'rejected') return { label: '관리자 반려', bg: '#fef3c7', color: '#92400e' };

    if (m.adminStatus === 'approved') return { label: '쌍방 검토 중', bg: 'rgba(6,182,212,0.1)', color: '#0e7490' };

    return { label: '검토 대기', bg: 'rgba(100,50,220,0.08)', color: '#7c3aed' };

  };



  return (

    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* Toast */}

      {toast && (

        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)', boxShadow: '0 8px 24px rgba(147,51,234,0.3)' }}>

          {toast}

        </div>

      )}



      {/* Header */}

      <div className="mb-8 flex items-end justify-between">

        <div>

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9090a8' }}>Admin · AI Matching</p>

          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>매칭 관리</h1>

        </div>

      </div>



      {/* Stats */}

      <div className="grid grid-cols-5 gap-3 mb-7">

        {[

          { key: 'all', label: '전체', value: counts.all, color: '#1a1a2e' },

          { key: 'pending', label: '검토 대기', value: counts.pending, color: '#7c3aed' },

          { key: 'approved', label: '쌍방 검토 중', value: counts.approved, color: '#0e7490' },

          { key: 'completed', label: '최종 성사', value: counts.completed, color: '#1a9e5c' },

          { key: 'failed', label: '실패', value: counts.failed, color: '#d93025' },

        ].map((s) => (

          <button

            key={s.key}

            onClick={() => setStatusFilter(s.key as any)}

            className="rounded-2xl p-4 text-center transition-all"

            style={{

              background: statusFilter === s.key ? 'rgba(100,50,220,0.05)' : '#fff',

              border: statusFilter === s.key ? '1.5px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2',

            }}

          >

            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>

            <p className="text-[11px] font-medium mt-0.5" style={{ color: '#9090a8' }}>{s.label}</p>

          </button>

        ))}

      </div>



      {/* Separator */}

      <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, rgba(100,50,220,0.15), transparent)' }} />



      {/* Match list */}

      <div className="space-y-4">

        {filteredMatches.map((match) => {

          const badge = statusBadge(match);

          const isExpanded = expandedId === match.id;



          return (

            <div key={match.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eaeaf2', background: '#fff' }}>

              {/* Card header row */}

              <div

                className="flex items-center gap-5 p-5 cursor-pointer"

                style={{ borderBottom: isExpanded ? '1px solid #eaeaf2' : 'none' }}

                onClick={() => setExpandedId(isExpanded ? null : match.id)}

              >

                {/* Score */}

                <div className="shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.08), rgba(6,182,212,0.08))' }}>

                  <span className="text-xl font-bold" style={{ color: '#9333ea' }}>{match.totalScore}</span>

                  <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#9090a8' }}>점수</span>

                </div>



                {/* Main info */}

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-2 mb-1 flex-wrap">

                    <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>{match.shipper.companyName}</span>

                    <span style={{ color: '#9090a8' }}>↔</span>

                    <span className="font-bold text-sm" style={{ color: '#1a1a2e' }}>{match.logistics.companyName}</span>

                  </div>

                  <p className="text-xs" style={{ color: '#9090a8' }}>

                    {match.request.country} · HS {match.request.hsCode} · {match.request.transport} · {match.request.volume}t · {match.request.schedule}

                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">

                    {match.matchFactors.slice(0, 3).map((f, i) => (

                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(100,50,220,0.06)', color: '#7c3aed' }}>{f}</span>

                    ))}

                    {match.matchFactors.length > 3 && (

                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f0f0f8', color: '#9090a8' }}>+{match.matchFactors.length - 3}</span>

                    )}

                  </div>

                </div>



                {/* Status & expand */}

                <div className="flex items-center gap-3 shrink-0">

                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>

                  <span className="text-xs font-mono" style={{ color: '#9090a8' }}>{match.createdAt.split(' ')[0]}</span>

                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#9090a8', transform: isExpanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>

                    <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

                  </svg>

                </div>

              </div>



              {/* Expanded detail */}

              {isExpanded && (

                <div className="p-5 space-y-5">

                  {/* Match factors */}

                  <div>

                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9090a8' }}>매칭 분석 요소</p>

                    <div className="flex flex-wrap gap-2">

                      {match.matchFactors.map((f, i) => (

                        <span key={i} className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(100,50,220,0.06)', color: '#7c3aed', border: '1px solid rgba(100,50,220,0.12)' }}>✓ {f}</span>

                      ))}

                    </div>

                  </div>



                  {/* 세부 점수: 샘플 값이며 실제 연동 시 서버 점수를 사용합니다. */}

                  <div>

                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9090a8' }}>매칭 세부 점수</p>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

                      {[

                        { label: '노선', score: match.routeScore, max: 30 },

                        { label: '가용 물량', score: match.capacityScore, max: 25 },

                        { label: 'HS코드', score: match.itemScore, max: 20 },

                        { label: '일정', score: match.scheduleScore, max: 15 },

                        { label: '경험', score: match.experienceScore, max: 10 },

                      ].map((item) => (

                        <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2' }}>

                          <p className="text-[11px] font-semibold mb-1" style={{ color: '#9090a8' }}>{item.label}</p>

                          <p className="text-lg font-bold" style={{ color: '#9333ea' }}>

                            {item.score}

                            <span className="text-xs font-normal" style={{ color: '#9090a8' }}>{' '}/ {item.max}</span>

                          </p>

                        </div>

                      ))}

                    </div>

                  </div>



                  {/* Side-by-side comparison */}

                  <div>

                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9090a8' }}>요청 vs 제공 비교</p>

                    <div className="grid grid-cols-2 gap-4">

                      {/* Shipper */}

                      <div className="rounded-xl p-4" style={{ background: 'rgba(147,51,234,0.03)', border: '1px solid rgba(147,51,234,0.12)' }}>

                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9333ea' }}>화주 요청 정보</p>

                        <p className="text-xs font-bold mb-1" style={{ color: '#1a1a2e' }}>{match.shipper.companyName}</p>

                        <p className="text-[10px] mb-3" style={{ color: '#9090a8' }}>{match.shipper.contactName} · {match.shipper.phone}</p>

                        <div className="space-y-1.5 text-xs">

                          {[

                            ['타겟 국가', match.request.country],

                            ['HS 코드', match.request.hsCode],

                            ['구분', match.request.tradeType],

                            ['운송방식', match.request.transport],

                            ['출발지', match.request.departure],

                            ['도착지', match.request.destination],

                            ['물량', `${match.request.volume}t`],

                            ['희망 일정', match.request.schedule],

                            ['화물 조건', match.request.cargoType],

                            ['냉장/냉동', match.request.refrigeration ? 'O' : 'X'],

                            ['위험물', match.request.hazmat ? 'O' : 'X'],

                            ['중량물', match.request.heavy ? 'O' : 'X'],

                            ['특수화물', match.request.special ? 'O' : 'X'],

                          ].map(([k, v]) => (

                            <div key={k} className="flex items-center justify-between">

                              <span style={{ color: '#9090a8' }}>{k}</span>

                              <span className="font-semibold" style={{ color: '#1a1a2e' }}>{v}</span>

                            </div>

                          ))}

                        </div>

                      </div>



                      {/* Logistics */}

                      <div className="rounded-xl p-4" style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)' }}>

                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#06b6d4' }}>물류업체 제공 정보</p>

                        <p className="text-xs font-bold mb-1" style={{ color: '#1a1a2e' }}>{match.logistics.companyName}</p>

                        <p className="text-[10px] mb-3" style={{ color: '#9090a8' }}>{match.logistics.contactName} · {match.logistics.phone}</p>

                        <div className="space-y-1.5 text-xs">

                          {[

                            ['서비스 국가', match.offer.country, match.offer.country === match.request.country],

                            ['HS 코드', match.offer.hsCode, match.offer.hsCode === match.request.hsCode],

                            ['운송방식', match.offer.transport, (match.offer.transport === 'SEA') === (match.request.transport === '해상')],

                            ['출발지', match.offer.departure, match.offer.departure.includes(match.request.departure.replace('항', '').replace('공항', ''))],

                            ['도착지', match.offer.destination, null],

                            ['정기노선', match.offer.regularRoute ? 'O' : 'X', null],

                            ['직항', match.offer.directRoute ? 'O' : 'X', null],

                            ['리드타임', `${match.offer.leadTime}일`, null],

                            ['가용 일정', match.offer.availableDate, null],

                            ['가용 물량', `${match.offer.availableCapacity}t`, match.offer.availableCapacity >= match.request.volume],

                            ['냉장/냉동 취급', match.offer.refrigeration ? 'O' : 'X', match.offer.refrigeration === match.request.refrigeration],

                            ['위험물 취급', match.offer.hazmat ? 'O' : 'X', match.offer.hazmat === match.request.hazmat],

                            ['중량물 취급', match.offer.heavy ? 'O' : 'X', null],

                            ['취급 경험', `${match.offer.experience}회`, null],

                          ].map(([k, v, matched]) => (

                            <div key={k as string} className="flex items-center justify-between">

                              <span style={{ color: '#9090a8' }}>{k as string}</span>

                              <div className="flex items-center gap-1.5">

                                <span className="font-semibold" style={{ color: '#1a1a2e' }}>{v as string}</span>

                                {matched !== null && matched !== undefined && <MatchBadge match={matched as boolean} />}

                              </div>

                            </div>

                          ))}

                        </div>

                      </div>

                    </div>

                  </div>



                  {/* Admin actions */}

                  {match.adminStatus === 'pending' && (

                    <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #f0f0f8' }}>

                      <p className="text-xs font-semibold flex-1" style={{ color: '#9090a8' }}>관리자 검토 결과를 선택하세요</p>

                      <button onClick={() => approveByAdmin(match.id)} className="px-5 py-2 rounded-full text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>

                        매칭 승인 → 알림 발송

                      </button>

                      <button onClick={() => setAdminRejectModalId(match.id)} className="px-5 py-2 rounded-full text-sm font-bold hover:bg-red-50 transition-colors" style={{ border: '1px solid #eaeaf2', color: '#d93025' }}>

                        반려

                      </button>

                    </div>

                  )}



                  {/* Approved: show notification info + party responses */}

                  {match.adminStatus === 'approved' && (

                    <div className="pt-4 space-y-4" style={{ borderTop: '1px solid #f0f0f8' }}>

                      {/* Notification sent */}

                      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(26,158,92,0.06)', border: '1px solid rgba(26,158,92,0.15)' }}>

                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">

                          <circle cx="8" cy="8" r="7.5" stroke="#1a9e5c"/>

                          <path d="M4 8l3 3 5-6" stroke="#1a9e5c" strokeWidth="1.5" strokeLinecap="round"/>

                        </svg>

                        <div className="text-xs" style={{ color: '#1a9e5c' }}>

                          <span className="font-bold">매칭 알림 발송 완료</span>

                          <span className="ml-2 font-normal" style={{ color: '#5e5e7a' }}>

                            회사명 · 담당자 · 사업자번호 · 연락처 · 주소 · 매칭 노선 정보 전달됨

                          </span>

                        </div>

                      </div>



                      {/* Party response section */}

                      <div>

                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9090a8' }}>쌍방 수락 현황</p>

                        <div className="grid grid-cols-2 gap-3">

                          {(['shipper', 'logistics'] as const).map((party) => {

                            const p = match[party];

                            const label = party === 'shipper' ? '화주사' : '물류업체';

                            return (

                              <div key={party} className="rounded-xl p-4" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2' }}>

                                <div className="flex items-center justify-between mb-2">

                                  <span className="text-xs font-bold" style={{ color: '#1a1a2e' }}>{label}: {p.companyName}</span>

                                  <span

                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"

                                    style={{

                                      background: p.response === 'accepted' ? '#dcfce7' : p.response === 'rejected' ? '#fee2e2' : '#f0f0f8',

                                      color: p.response === 'accepted' ? '#166534' : p.response === 'rejected' ? '#991b1b' : '#9090a8',

                                    }}

                                  >

                                    {p.response === 'accepted' ? '수락' : p.response === 'rejected' ? '거절' : '대기 중'}

                                  </span>

                                </div>

                                <p className="text-[10px] mb-3" style={{ color: '#9090a8' }}>

                                  {p.contactName} · {p.phone}<br />{p.bizNumber}<br />{p.address}

                                </p>

                                {p.response === 'rejected' && p.rejectReason && (

                                  <p className="text-[10px] px-2 py-1 rounded-lg mb-2" style={{ background: 'rgba(217,48,37,0.06)', color: '#d93025' }}>

                                    거절 사유: {p.rejectReason}

                                  </p>

                                )}

                                {p.response === 'waiting' && match.finalStatus === 'pending' && (

                                  <div className="flex gap-2">

                                    <button onClick={() => respondAsParty(match.id, party, 'accepted')} className="flex-1 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>수락</button>

                                    <button onClick={() => setRejectModalId({ matchId: match.id, party })} className="flex-1 py-1.5 rounded-full text-xs font-semibold" style={{ border: '1px solid #eaeaf2', color: '#d93025' }}>거절</button>

                                  </div>

                                )}

                              </div>

                            );

                          })}

                        </div>



                        {match.finalStatus === 'completed' && (

                          <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(26,158,92,0.06)', border: '1px solid rgba(26,158,92,0.2)' }}>

                            <p className="text-sm font-bold" style={{ color: '#1a9e5c' }}>🎉 매칭 최종 성사 — 감사 로그에 기록되었습니다</p>

                          </div>

                        )}

                        {match.finalStatus === 'failed' && (

                          <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(217,48,37,0.04)', border: '1px solid rgba(217,48,37,0.15)' }}>

                            <p className="text-sm font-bold" style={{ color: '#d93025' }}>매칭 실패 — 거절 사유가 감사 로그에 기록되었습니다</p>

                          </div>

                        )}

                      </div>

                    </div>

                  )}



                  {match.adminStatus === 'rejected' && (

                    <div className="pt-4" style={{ borderTop: '1px solid #f0f0f8' }}>

                      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>

                        <p className="text-xs font-bold" style={{ color: '#92400e' }}>관리자 반려 · 사유: {match.adminRejectReason || '미기재'}</p>

                      </div>

                    </div>

                  )}

                </div>

              )}

            </div>

          );

        })}



        {filteredMatches.length === 0 && (

          <div className="text-center py-16" style={{ color: '#9090a8' }}>

            <p className="text-sm">해당 상태의 매칭 건이 없습니다.</p>

          </div>

        )}

      </div>



      {/* Admin reject modal */}

      {adminRejectModalId !== null && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>

          <div className="w-full max-w-sm rounded-2xl p-6 bg-white" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>

            <h3 className="font-bold text-base mb-1" style={{ color: '#1a1a2e' }}>매칭 반려</h3>

            <p className="text-xs mb-4" style={{ color: '#9090a8' }}>반려 사유를 선택하세요</p>

            <div className="space-y-2 mb-4">

              {REJECT_REASONS.map((r) => (

                <button key={r} onClick={() => setAdminRejectReason(r)} className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all" style={{ background: adminRejectReason === r ? 'rgba(100,50,220,0.08)' : '#f9f9fc', color: adminRejectReason === r ? '#9333ea' : '#1a1a2e', border: adminRejectReason === r ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2' }}>

                  {r}

                </button>

              ))}

            </div>

            <div className="flex gap-2">

              <button onClick={() => { setAdminRejectModalId(null); setAdminRejectReason(''); }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2', color: '#5e5e7a' }}>취소</button>

              <button onClick={() => adminRejectModalId && rejectByAdmin(adminRejectModalId)} className="flex-1 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#d93025' }} disabled={!adminRejectReason}>

                반려 확인

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Party reject modal */}

      {rejectModalId !== null && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>

          <div className="w-full max-w-sm rounded-2xl p-6 bg-white" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>

            <h3 className="font-bold text-base mb-1" style={{ color: '#1a1a2e' }}>

              {rejectModalId.party === 'shipper' ? '화주사' : '물류업체'} 거절

            </h3>

            <p className="text-xs mb-4" style={{ color: '#9090a8' }}>거절 사유를 선택하세요</p>

            <div className="space-y-2 mb-4">

              {REJECT_REASONS.map((r) => (

                <button key={r} onClick={() => setRejectReason(r)} className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all" style={{ background: rejectReason === r ? 'rgba(100,50,220,0.08)' : '#f9f9fc', color: rejectReason === r ? '#9333ea' : '#1a1a2e', border: rejectReason === r ? '1px solid rgba(100,50,220,0.2)' : '1px solid #eaeaf2' }}>

                  {r}

                </button>

              ))}

            </div>

            <div className="flex gap-2">

              <button onClick={() => { setRejectModalId(null); setRejectReason(''); }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f9f9fc', border: '1px solid #eaeaf2', color: '#5e5e7a' }}>취소</button>

              <button

                onClick={() => rejectModalId && respondAsParty(rejectModalId.matchId, rejectModalId.party, 'rejected', rejectReason)}

                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"

                style={{ background: '#d93025' }}

                disabled={!rejectReason}

              >

                거절 확인

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}