interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

// 로그인/회원가입 모달의 "라벨 + 입력칸 + 오류 메시지" 한 줄
export default function AuthField({ label, value, onChange, type = 'text', placeholder, error, required }: AuthFieldProps) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="auth-input"
      />
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}
