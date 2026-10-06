import { useState } from 'react';
import type { User, CompanyType } from '../../types/user';
import macrossLogo from '../../assets/main-reference.png';
import AuthField from './AuthField';
import './AuthModal.css';

interface SignupModalProps {
  onSignup: (user: User, password: string) => void;
  onClose: () => void;
  onLoginClick: () => void;
  existingEmails: string[];
}

// 회원가입 단계 : 1(계정 정보) → 2(기업 정보) → 'done'(완료 화면)
type Step = 1 | 2 | 'done';

export default function SignupModal({ onSignup, onClose, onLoginClick, existingEmails }: SignupModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [companyType, setCompanyType] = useState<CompanyType>('수출입기업');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  // 칸별 오류 문구 { email: '유효한 이메일을...', password: '...' }
  // [TS] Record<string, string> : 키도 글자, 값도 글자인 객체 (가이드 2-8)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 특정 칸(k)의 오류 문구만 지우기 — [k] 는 변수 k 의 값을 칸 이름으로 사용
  const clearError = (k: string) => setErrors((p) => ({ ...p, [k]: '' }));

  // 1단계: 계정 정보 검사
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!email.includes('@')) e.email = '유효한 이메일을 입력하세요.';
    else if (existingEmails.includes(email)) e.email = '이미 등록된 이메일입니다.';
    if (password.length < 6) e.password = '비밀번호는 6자 이상이어야 합니다.';
    if (password !== passwordConfirm) e.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setErrors(e);
    // Object.keys(e) : 오류가 담긴 칸 이름 배열 → 0개면 통과(true)
    return Object.keys(e).length === 0;
  };

  // 2단계: 기업 정보 검사
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = '회사명을 입력하세요.';
    if (!name.trim()) e.name = '담당자 이름을 입력하세요.';
    if (!businessNumber.trim()) e.businessNumber = '사업자등록번호를 입력하세요.';
    if (!phone.trim()) e.phone = '연락처를 입력하세요.';
    if (!address.trim()) e.address = '회사 주소를 입력하세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSubmit = () => {
    if (!validateStep2()) return;
    onSignup({ name, email, role: 'user', companyType, companyName, businessNumber, phone, address }, password);
    setStep('done');
  };

  return (
    <div className="auth-backdrop auth-backdrop--scroll" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-card auth-card--wide">
        {/* 상단 로고 */}
        <div className="signup-brand">
          <img src={macrossLogo} alt="MACROSS" />
          <div>
            <h2>MACROSS 회원가입</h2>
            <p>B2B 무역 & 물류 플랫폼</p>
          </div>
        </div>

        {/* 가입 완료 */}
        {step === 'done' && (
          <div className="signup-done">
            <div className="signup-done__icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="#1a9e5c" strokeWidth="1.5" />
                <path d="M9 16l5 5 9-10" stroke="#1a9e5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3>회원가입이 완료되었습니다!</h3>
              <p>MACROSS 플랫폼에 오신 것을 환영합니다.<br />로그인 후 서비스를 이용하실 수 있습니다.</p>
            </div>
            <button onClick={onLoginClick} className="auth-primary-btn">
              로그인하기
            </button>
          </div>
        )}

        {/* 단계 표시 */}
        {step !== 'done' && (
          <div className="signup-steps">
            {/* 단계 동그라미 2개 : 지금 단계 이상이면 is-reached 로 색칠 */}
            {[1, 2].map((s) => (
              <div key={s} className={step >= s ? 'signup-step is-reached' : 'signup-step'}>
                <div className="signup-step__num">{s}</div>
                <span className="signup-step__label">{s === 1 ? '계정 정보' : '기업 정보'}</span>
                {s < 2 && <div className={step > s ? 'signup-step__line is-done' : 'signup-step__line'} />}
              </div>
            ))}
          </div>
        )}

        {/* 1단계: 계정 정보 */}
        {step === 1 && (
          <div className="signup-fields">
            <div>
              <label className="form-label signup-type-label">기업 유형 *</label>
              <div className="signup-type-grid">
                {(['수출입기업', '물류업체'] as CompanyType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCompanyType(type)}
                    className={companyType === type ? 'signup-type-btn is-active' : 'signup-type-btn'}
                  >
                    {type === '수출입기업' ? '🏭 수출입기업' : '🚢 물류운송업체'}
                  </button>
                ))}
              </div>
            </div>
            <AuthField label="이메일 (아이디) *" value={email} onChange={(v) => { setEmail(v); clearError('email'); }} type="email" placeholder="name@company.com" error={errors.email} />
            <AuthField label="비밀번호 *" value={password} onChange={(v) => { setPassword(v); clearError('password'); }} type="password" placeholder="6자 이상" error={errors.password} />
            <AuthField label="비밀번호 재입력 *" value={passwordConfirm} onChange={(v) => { setPasswordConfirm(v); clearError('passwordConfirm'); }} type="password" placeholder="비밀번호 확인" error={errors.passwordConfirm} />
            <button onClick={handleNext} className="auth-primary-btn signup-next-btn">
              다음 →
            </button>
          </div>
        )}

        {/* 2단계: 기업 정보 */}
        {step === 2 && (
          <div className="signup-fields">
            <AuthField label="회사명 *" value={companyName} onChange={(v) => { setCompanyName(v); clearError('companyName'); }} placeholder="(주)예시기업" error={errors.companyName} />
            <AuthField label="담당자 이름 *" value={name} onChange={(v) => { setName(v); clearError('name'); }} placeholder="홍길동" error={errors.name} />
            <AuthField label="사업자등록번호 *" value={businessNumber} onChange={(v) => { setBusinessNumber(v); clearError('businessNumber'); }} placeholder="000-00-00000" error={errors.businessNumber} />
            <AuthField label="연락처 *" value={phone} onChange={(v) => { setPhone(v); clearError('phone'); }} placeholder="010-0000-0000" error={errors.phone} />
            <div>
              <label className="form-label">회사 주소 *</label>
              <textarea
                value={address}
                onChange={(e) => { setAddress(e.target.value); clearError('address'); }}
                placeholder="서울시 강남구 테헤란로 123, 456호"
                rows={2}
                className="auth-input"
              />
              {errors.address && <p className="auth-field-error">{errors.address}</p>}
            </div>
            <div className="signup-actions">
              <button onClick={() => setStep(1)} className="signup-prev-btn">← 이전</button>
              <button onClick={handleSubmit} className="auth-primary-btn">가입 완료</button>
            </div>
          </div>
        )}

        {step !== 'done' && (
          <p className="auth-footer">
            이미 계정이 있으신가요?{' '}
            <button onClick={onLoginClick}>로그인</button>
          </p>
        )}
      </div>
    </div>
  );
}
