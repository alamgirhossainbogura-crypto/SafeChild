import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import GuardianView from './GuardianView.tsx'
import './index.css'

const isGuardianView = new URLSearchParams(window.location.search).get('guardian') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isGuardianView ? <GuardianView /> : <App />}
  </React.StrictMode>,
)
