import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'          // 전역 스타일 (Tailwind 기본 초기화, 폰트, 색상 변수)
import './styles/common.css'  // 여러 페이지 공통 클래스
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
