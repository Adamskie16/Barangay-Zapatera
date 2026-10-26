// Admin/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PublicApiDocsPage from './features/docs/PublicApiDocsPage.jsx'
import PublicOpenApiJsonPage from './features/docs/PublicOpenApiJsonPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/docs/api" element={<PublicApiDocsPage />} />
        <Route path="/docs/api/*" element={<PublicApiDocsPage />} />
        <Route path="/docs" element={<Navigate to="/docs/api" replace />} />
        <Route path="/openapi.json" element={<PublicOpenApiJsonPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
