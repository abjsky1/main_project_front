import { useState } from 'react';
import macrossLogo from '../assets/main-reference.png';

const DEMO_ACCOUNTS = [
  {
    label: '🔑 관리자',
    email: 'admin@naver.com',
    password: '1234qwer',
    desc: '1234qwer'
  },
  {
    label: '🏭 수출입기업',
    email: 'ybtex@test.com',
    password: 'pass123',
    desc: 'pass123'
  },
  {
    label: '🚢 물류업체',
    email: 'hmm@logis.com',
    password: 'pass123',
    desc: 'pass123'
  },
];

interface LoginModalProps {

  // 백엔드 로그인을 하므로 Promise로 변경
  onLogin:
    (email: string, password: string)
      => Promise<string | null>;

  onClose: () => void;

  onSignupClick: () => void;
}

export default function LoginModal({
  onLogin,
  onClose,
  onSignupClick
}: LoginModalProps) {

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);


  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #eaeaf2',
    fontSize: 13,
    color: '#1a1a2e',
    background: '#f9f9fc',
    outline: 'none',
    fontFamily:
      'Plus Jakarta Sans, sans-serif',
    transition: 'border-color 0.15s',
  };


  // 로그인 버튼
  const handleSubmit =
    async (e: React.FormEvent) => {

      e.preventDefault();

      setError('');
      setLoading(true);

      try {

        // App.tsx의 백엔드 로그인 함수 실행
        const err =
          await onLogin(
            email,
            password
          );

        if (err) {
          setError(err);
        }

      } finally {

        setLoading(false);

      }

    };


  // 테스트 계정 입력칸 자동 채우기
  const fillDemo = (
    account:
      (typeof DEMO_ACCOUNTS)[0]
  ) => {

    setEmail(account.email);
    setPassword(account.password);
    setError('');

  };


  return (

    <div
      className="
        fixed inset-0
        z-[100]
        flex items-center
        justify-center
        p-4
      "
      style={{
        background:
          'rgba(0,0,0,0.5)',
        backdropFilter:
          'blur(4px)'
      }}
      onClick={(e) =>
        e.target ===
          e.currentTarget &&
        onClose()
      }
    >

      <div
        className="
          w-full
          max-w-sm
          rounded-3xl
          p-8
        "
        style={{
          background: '#ffffff',
          boxShadow:
            '0 32px 80px rgba(0,0,0,0.18)'
        }}
      >

        {/* 로고 */}
        <div className="
          flex flex-col
          items-center
          mb-7
        ">

          <img
            src={macrossLogo}
            alt="MACROSS"
            className="
              h-11 w-auto mb-3
            "
          />

          <h2
            className="
              text-xl font-bold
            "
            style={{
              color: '#1a1a2e'
            }}
          >
            로그인
          </h2>

          <p
            className="
              text-xs mt-1
            "
            style={{
              color: '#9090a8'
            }}
          >
            B2B 무역 & 물류 플랫폼
          </p>

        </div>


        {/* 로그인 폼 */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >

          {/* 이메일 */}
          <div>

            <label
              className="
                block
                text-xs
                font-semibold
                mb-1.5
                uppercase
                tracking-wide
              "
              style={{
                color: '#5e5e7a'
              }}
            >
              이메일
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {

                setEmail(
                  e.target.value
                );

                setError('');

              }}
              placeholder=
                "name@company.com"
              style={inputStyle}
              onFocus={(e) => {

                e.currentTarget
                  .style
                  .borderColor =
                  '#9333ea';

                e.currentTarget
                  .style
                  .background =
                  '#fff';

              }}
              onBlur={(e) => {

                e.currentTarget
                  .style
                  .borderColor =
                  '#eaeaf2';

                e.currentTarget
                  .style
                  .background =
                  '#f9f9fc';

              }}
              required
            />

          </div>


          {/* 비밀번호 */}
          <div>

            <label
              className="
                block
                text-xs
                font-semibold
                mb-1.5
                uppercase
                tracking-wide
              "
              style={{
                color: '#5e5e7a'
              }}
            >
              비밀번호
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {

                setPassword(
                  e.target.value
                );

                setError('');

              }}
              placeholder="••••••••"
              style={inputStyle}
              required
            />

          </div>


          {/* 오류 메시지 */}
          {error && (

            <p
              className="
                text-xs
                px-3
                py-2
                rounded-lg
              "
              style={{
                color: '#d93025',
                background:
                  'rgba(217,48,37,0.06)'
              }}
            >
              {error}
            </p>

          )}


          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              py-2.5
              rounded-xl
              text-sm
              font-bold
              text-white
              transition-opacity
              hover:opacity-90
            "
            style={{
              background:
                'linear-gradient(135deg, #9333ea, #06b6d4)',
              opacity:
                loading ? 0.6 : 1
            }}
          >

            {loading
              ? '로그인 중...'
              : '로그인'}

          </button>

        </form>


        {/* 테스트 계정 */}
        <div
          className="mt-5 pt-5"
          style={{
            borderTop:
              '1px solid #f0f0f8'
          }}
        >

          <p
            className="
              text-xs
              text-center
              mb-3
            "
            style={{
              color: '#9090a8'
            }}
          >
            테스트 계정으로 빠른 로그인
          </p>


          <div className="
            grid
            grid-cols-3
            gap-1.5
          ">

            {DEMO_ACCOUNTS.map(
              (account) => (

                <button
                  type="button"
                  key={account.email}
                  onClick={() =>
                    fillDemo(account)
                  }
                  className="
                    py-2
                    px-2
                    rounded-xl
                    text-[11px]
                    font-semibold
                    transition-all
                    text-center
                  "
                  style={{
                    background:
                      'rgba(100,50,220,0.04)',
                    color:
                      '#9333ea',
                    border:
                      '1px solid rgba(100,50,220,0.12)',
                  }}
                >

                  {account.label}

                  <span
                    className="
                      block
                      text-[10px]
                      font-normal
                    "
                    style={{
                      color:
                        '#9090a8'
                    }}
                  >
                    {account.desc}
                  </span>

                </button>

              )
            )}

          </div>

        </div>


        {/* 회원가입 */}
        <p
          className="
            text-center
            text-xs
            mt-5
          "
          style={{
            color: '#9090a8'
          }}
        >

          계정이 없으신가요?{' '}

          <button
            type="button"
            onClick={
              onSignupClick
            }
            className="
              font-bold
              underline
            "
            style={{
              color: '#9333ea'
            }}
          >
            회원가입
          </button>

        </p>

      </div>

    </div>

  );

}