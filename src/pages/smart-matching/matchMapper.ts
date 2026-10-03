import { fetchCountries, fetchRoutes, type CountryData, type RouteData } from '../../api/referenceData';
import { getMatchingList, type MatchingApiDto } from '../../api/matchingApi';
import {
  getCscore1List, getCscore2, getCscore3, getLscore1List, getLscore2, getLscore3,
  type CargoDto, type Cscore1Dto, type Cscore2Dto, type Lscore1Dto, type Lscore2Dto,
} from '../../api/scoreApi';
import type { AdminStatus, FinalStatus, MatchItem, PartyResponse } from './matchTypes';

/* =====================================================================
   백엔드 매칭 결과(DTO) → 화면용 MatchItem 변환
   ===================================================================== */

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

// 카드에 표시할 "매칭 분석 요소" 문구 목록
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
      : `HS코드 적합도 반영 (${cscore1.hsCode} ↔ ${lscore1.hsCode})`,
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

// DB에 저장된 매칭 결과를 MatchItem 목록으로 불러오기
export async function loadMatchItems(signal: AbortSignal): Promise<MatchItem[] | null> {
  // 1. 매칭 + Cscore1 + Lscore1 + CSV 기준정보 전체 조회
  const [matchings, cscore1List, lscore1List, countries, routes] = await Promise.all([
    getMatchingList(signal),
    getCscore1List(undefined, signal),
    getLscore1List(undefined, signal),
    fetchCountries(signal),
    fetchRoutes(signal),
  ]);

  if (signal.aborted) return null;

  const rows = await Promise.all(
    matchings.map(async (matching): Promise<MatchItem | null> => {
      const cscore1 = cscore1List.find((item) => item.cscore1Id === matching.cscore1Id);
      const lscore1 = lscore1List.find((item) => item.lscore1Id === matching.lscore1Id);

      if (!cscore1 || !lscore1) {
        console.log('매칭 조건 1번 정보가 없습니다.', matching);
        return null;
      }

      // 2. 선택된 매칭의 Cscore2/3, Lscore2/3 상세 조회
      const [cscore2, cscore3, lscore2, lscore3] = await Promise.all([
        getCscore2(matching.cscore1Id, signal),
        getCscore3(matching.cscore1Id, signal),
        getLscore2(matching.lscore1Id, signal),
        getLscore3(matching.lscore1Id, signal),
      ]);

      if (!cscore2 || !cscore3 || !lscore2 || !lscore3) {
        console.log('매칭 조건 2/3번 상세 정보가 없습니다.', matching);
        return null;
      }

      const countryName = getCountryName(countries, cscore1.countryId);

      // 3. 화면에서 사용하는 MatchItem 구조로 변환
      return {
        id: matching.matchingId,
        createdAt: matching.createdAt ? matching.createdAt.replace('T', ' ').slice(0, 16) : '-',

        routeScore: matching.routeScore,
        capacityScore: matching.capacityScore,
        itemScore: matching.itemScore,
        scheduleScore: matching.scheduleScore,
        experienceScore: matching.experienceScore,
        totalScore: matching.totalScore,

        matchFactors: makeMatchFactors(cscore1, cscore2, cscore3, lscore1, lscore2, countryName),

        adminStatus: toAdminStatus(matching.adminStatus),
        adminRejectReason:
          matching.adminStatus === 'REJECTED' && matching.warningMessage && matching.warningMessage !== '-'
            ? matching.warningMessage
            : undefined,
        finalStatus: toFinalStatus(matching.finalStatus),

        shipper: {
          companyName: matching.shipperCompanyName ?? `수출입기업 (${shortMemberId(cscore1.memberId)})`,
          contactName: matching.shipperContactName ?? '-',
          bizNumber: matching.shipperBizNumber ?? '-',
          phone: matching.shipperPhone ?? '-',
          address: matching.shipperAddress ?? '-',
          response: toPartyResponse(matching.shipperStatus),
        },

        logistics: {
          companyName: matching.logisticsCompanyName ?? `물류기업 (${shortMemberId(lscore1.memberId)})`,
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
    }),
  );

  if (signal.aborted) return null;

  return rows.filter((row): row is MatchItem => row !== null);
}
