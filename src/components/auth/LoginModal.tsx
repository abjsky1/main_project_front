import { useState } from 'react';
import macrossLogo from '../../assets/main-reference.png';
import AuthField from './AuthField';
import './AuthModal.css';

// 테스트 계정 (버튼을 누르면 입력칸이 자동으로 채워짐)
const DEMO_ACCOUNTS = [
  { label: '🔑 관리자', email: 'admin@naver.com', password: '1234qwer', desc: '1234qwer' },
  { label: '🏭 수출입기업', email: 'ybtex@test.com', password: 'pass123', desc: 'pass123' },
  { label: '🚢 물류업체', email: 'hmm@logis.com', password: 'pass123', desc: 'pass123' },
];

interface LoginModalProps {
  // 백엔드 로그인 결과: 실패하면 오류 메시지, 성공하면 null
  onLogin: (email: string, password: string) => Promise<string | null>;
  onClose: () => void;
  onSignupClick: () => void;
}

export default function LoginModal({ onLogin, onClose, onSignupClick }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 로그인 버튼
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // App.tsx의 백엔드 로그인 함수 실행
      const err = await onLogin(email, password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  // 테스트 계정 입력칸 자동 채우기
  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="auth-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-card">
        {/* 로고 */}
        <div className="login-brand">
          <img src={macrossLogo} alt="MACROSS" />
          <h2>로그인</h2>
          <p>B2B 무역 & 물류 플랫폼</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="login-form">
          <AuthField
            label="이메일"
            type="email"
            value={email}
            onChange={(v) => { setEmail(v); setError(''); }}
            placeholder="name@company.com"
            required
          />
          <AuthField
            label="비밀번호"
            type="password"
            value={password}
            onChange={(v) => { setPassword(v); setError(''); }}
            placeholder="••••••••"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={loading ? 'auth-primary-btn login-submit is-loading' : 'auth-primary-btn login-submit'}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 테스트 계정 */}
        <div className="demo-accounts">
          <p className="demo-accounts__title">테스트 계정으로 빠른 로그인</p>
          <div className="demo-accounts__grid">
            {DEMO_ACCOUNTS.map((account) => (
              <button type="button" key={account.email} onClick={() => fillDemo(account)} className="demo-accounts__btn">
                {account.label}
                <span>{account.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 회원가입 */}
        <p className="auth-footer">
          계정이 없으신가요?{' '}
          <button type="button" onClick={onSignupClick}>
            회원가입
          </button>
        </p>
      </div>
    </div>
  );
}
