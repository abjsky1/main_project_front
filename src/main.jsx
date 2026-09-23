// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


// [필수]
// 1. 리액트 라이브러리 최초 렌더링(그리기)하는 함수
import { createRoot } from "react-dom/client";
// 2. index.html 에서 root 마크업 가져오기  ,  #ID / .Class
const root = document.querySelector( '#root' );
// 3. 가져온 root 마크업을 creatRoot 함수에 전달함
const create = createRoot( root );


// [main_project]
import { BrowserRouter } from "react-router-dom";
import App from "./main_project/App";
create.render(<BrowserRouter><App></App></BrowserRouter>)