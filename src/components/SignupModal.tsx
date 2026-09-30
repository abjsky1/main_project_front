import { useState } from 'react';
import type { User, CompanyType } from '../App';
import macrossLogo from '../assets/main-reference.png';

interface SignupModalProps {
  onSignup: (user: User, password: string) => void;
  onClose: () => void;
  onLoginClick: () => void;
  existingEmails: string[];
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #eaeaf2',
  fontSize: 13, color: '#1a1a2e', background: '#f9f9fc', outline: 'none',
  fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s',
};

const focusStyle = { borderColor: '#9333ea', background: '#fff' };
const blurStyle = { borderColor: '#eaeaf2', background: '#f9f9fc' };

function InputField({
  label, value, onChange, type = 'text', placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
        onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
      />
      {error && <p className="text-xs mt-1" style={{ color: '#d93025' }}>{error}</p>}
    </div>
  );
}

export default function SignupModal({ onSignup, onClose, onLoginClick, existingEmails }: SignupModalProps) {
  const [step, setStep] = useState<1 | 2 | 'done'>(1);
  const [companyType, setCompanyType] = useState<CompanyType>('수출입기업');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (k: string) => setErrors((p) => ({ ...p, [k]: '' }));

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!email.includes('@')) e.email = '유효한 이메일을 입력하세요.';
    else if (existingEmails.includes(email)) e.email = '이미 등록된 이메일입니다.';
    if (password.length < 6) e.password = '비밀번호는 6자 이상이어야 합니다.';
    if (password !== passwordConfirm) e.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-3xl p-8 my-4" style={{ background: '#ffffff', boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={macrossLogo} alt="MACROSS" className="h-8 w-auto" />
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>MACROSS 회원가입</h2>
            <p className="text-xs" style={{ color: '#9090a8' }}>B2B 무역 & 물류 플랫폼</p>
          </div>
        </div>

        {/* Success */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-6 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,158,92,0.1)' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="#1a9e5c" strokeWidth="1.5"/>
                <path d="M9 16l5 5 9-10" stroke="#1a9e5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#1a1a2e' }}>회원가입이 완료되었습니다!</h3>
              <p className="text-sm" style={{ color: '#9090a8' }}>MACROSS 플랫폼에 오신 것을 환영합니다.<br />로그인 후 서비스를 이용하실 수 있습니다.</p>
            </div>
            <button onClick={onLoginClick} className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
              로그인하기
            </button>
          </div>
        )}

        {/* Step indicator */}
        {step !== 'done' && (
          <div className="flex items-center gap-3 mb-7">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: step >= s ? 'linear-gradient(135deg, #9333ea, #06b6d4)' : '#f0f0f8', color: step >= s ? '#fff' : '#9090a8' }}>
                  {s}
                </div>
                <span className="text-xs font-medium" style={{ color: step >= s ? '#1a1a2e' : '#9090a8' }}>
                  {s === 1 ? '계정 정보' : '기업 정보'}
                </span>
                {s < 2 && <div className="w-8 h-px" style={{ background: step > s ? '#9333ea' : '#eaeaf2' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>기업 유형 *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['수출입기업', '물류업체'] as CompanyType[]).map((type) => (
                  <button key={type} onClick={() => setCompanyType(type)} className="p-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: companyType === type ? 'linear-gradient(135deg, rgba(147,51,234,0.08), rgba(6,182,212,0.08))' : '#f9f9fc', border: companyType === type ? '1.5px solid rgba(147,51,234,0.3)' : '1px solid #eaeaf2', color: companyType === type ? '#9333ea' : '#5e5e7a' }}>
                    {type === '수출입기업' ? '🏭 수출입기업' : '🚢 물류운송업체'}
                  </button>
                ))}
              </div>
            </div>
            <InputField label="이메일 (아이디) *" value={email} onChange={(v) => { setEmail(v); clearError('email'); }} type="email" placeholder="name@company.com" error={errors.email} />
            <InputField label="비밀번호 *" value={password} onChange={(v) => { setPassword(v); clearError('password'); }} type="password" placeholder="6자 이상" error={errors.password} />
            <InputField label="비밀번호 재입력 *" value={passwordConfirm} onChange={(v) => { setPasswordConfirm(v); clearError('passwordConfirm'); }} type="password" placeholder="비밀번호 확인" error={errors.passwordConfirm} />
            <button onClick={handleNext} className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 mt-2" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
              다음 →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <InputField label="회사명 *" value={companyName} onChange={(v) => { setCompanyName(v); clearError('companyName'); }} placeholder="(주)예시기업" error={errors.companyName} />
            <InputField label="담당자 이름 *" value={name} onChange={(v) => { setName(v); clearError('name'); }} placeholder="홍길동" error={errors.name} />
            <InputField label="사업자등록번호 *" value={businessNumber} onChange={(v) => { setBusinessNumber(v); clearError('businessNumber'); }} placeholder="000-00-00000" error={errors.businessNumber} />
            <InputField label="연락처 *" value={phone} onChange={(v) => { setPhone(v); clearError('phone'); }} placeholder="010-0000-0000" error={errors.phone} />
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#5e5e7a' }}>회사 주소 *</label>
              <textarea value={address} onChange={(e) => { setAddress(e.target.value); clearError('address'); }}
                placeholder="서울시 강남구 테헤란로 123, 456호" rows={2}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              />
              {errors.address && <p className="text-xs mt-1" style={{ color: '#d93025' }}>{errors.address}</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: '#f9f9fc', color: '#5e5e7a', border: '1px solid #eaeaf2' }}>← 이전</button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>가입 완료</button>
            </div>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-xs mt-5" style={{ color: '#9090a8' }}>
            이미 계정이 있으신가요?{' '}
            <button onClick={onLoginClick} className="font-bold underline" style={{ color: '#9333ea' }}>로그인</button>
          </p>
        )}
      </div>
    </div>
  );
}
