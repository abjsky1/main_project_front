import axios from 'axios';

// 백엔드 마이페이지 API (main_project_back 의 MypageController)

// PUT /api/mypage/{memberId} : 내 정보(이름 · 주소) 수정 , 성공하면 true
// - 서버가 로그인 쿠키(AccessToken) 속 회원과 주소의 회원이 같은지 확인 → withCredentials: true 로 쿠키를 같이 보냄
// - 쿠키가 만료(로그인 후 약 20분)되면 false 가 옴 → 다시 로그인해야 함
export async function updateMyInfo(memberId: string, managerName: string, companyAddress: string) {
  const response = await axios.put<boolean>(
    `/api/mypage/${encodeURIComponent(memberId)}`,
    { managerName, companyAddress },
    { withCredentials: true },
  );
  return response.data;
}
