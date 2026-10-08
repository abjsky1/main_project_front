import { useState } from 'react';
import { loadDemoMatches, resetDemoMatches, saveDemoMatches, type MyMatchItem } from './myMatchingData';

// "내 매칭" 데모 데이터를 다루는 훅 (목록 페이지와 상세 페이지가 같이 사용)
// - 처음 : 브라우저에 저장된 데모 상태를 불러옴 (없으면 처음 데모 데이터)
// - 버튼을 누르면 : 1건을 바꾸고 브라우저에도 저장 → 다른 계정으로 로그인해도 바뀐 상태가 보임
//
// ⚠️ 백엔드 구현 후에는 이 훅 안을 axios 호출(조회 / 요청 / 수락 / 거절)로 바꾸면 화면 코드는 그대로 쓸 수 있음
export default function useMyMatchingDemo() {
  // useState(() => 값) : 처음 한 번만 함수를 실행해서 시작 값을 만듦 (매번 localStorage 를 읽지 않도록)
  const [matches, setMatches] = useState<MyMatchItem[]>(() => loadDemoMatches());

  // 매칭 1건 바꾸기
  // change : 바꾸기 전 매칭을 받아서 바뀐 매칭을 돌려주는 함수 (myMatchingData 의 shipperAccept 등)
  const updateMatch = (id: number, change: (m: MyMatchItem) => MyMatchItem) => {
    const next = matches.map((m) => (m.id === id ? change(m) : m));   // id 가 같은 것만 바꾼 새 배열
    setMatches(next);
    saveDemoMatches(next);
  };

  // [데모 초기화] : 처음 데모 데이터로 되돌리기
  const resetDemo = () => {
    setMatches(resetDemoMatches());
  };

  return { matches, updateMatch, resetDemo };
}
