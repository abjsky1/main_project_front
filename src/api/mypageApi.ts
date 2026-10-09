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

// PUT /api/mypage/password : 비밀번호 변경 , 성공하면 true
// - 어떤 회원인지는 서버가 로그인 쿠키(AccessToken)로 정함 → withCredentials: true 로 쿠키를 같이 보냄
// - 현재 비밀번호가 틀리거나 , 새 비밀번호가 6~20자가 아니거나 , 지금과 같거나 , 쿠키가 만료됐으면 false
export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await axios.put<boolean>('/api/mypage/password', { currentPassword, newPassword }, { withCredentials: true });
  return response.data;
}

// POST /api/mypage/withdraw : 회원 탈퇴 , 성공하면 true
// - 어떤 회원인지는 서버가 로그인 쿠키(AccessToken)로 정함 → withCredentials: true 로 쿠키를 같이 보냄
// - 비밀번호가 틀리거나 , 쿠키가 만료됐거나 , 관리자 계정이면 false
// - 성공하면 서버가 쿠키 2개를 지워 줌 (로그아웃과 같은 상태가 됨)
export async function withdrawMember(userPassword: string) {
  const response = await axios.post<boolean>('/api/mypage/withdraw', { userPassword }, { withCredentials: true });
  return response.data;
}
