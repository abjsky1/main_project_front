// 프로그램 시작점 : index.html 의 <div id="root"> 안에 App 을 그림 (B_react 의 main.jsx 와 같음)
// React.StrictMode : 개발 중 실수를 찾아주는 검사 모드 (useEffect 를 일부러 2번 실행함 — 가이드 3-4)
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'          // 전역 스타일 (Tailwind 기본 초기화, 폰트, 색상 변수)
import './styles/common.css'  // 여러 페이지 공통 클래스
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 주소(path) 기반 페이지 이동 — basename 은 vite.config.ts 의 base 와 맞춤 */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
