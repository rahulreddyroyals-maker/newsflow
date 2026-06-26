// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import BottomNav from './components/BottomNav'

import Splash from './pages/Splash'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import Home from './pages/Home'
import Search from './pages/Search'
import NewsDetail from './pages/NewsDetail'
import Bookmarks from './pages/Bookmarks'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

import JournalistDashboard from './journalist/Dashboard'
import SubmitNews from './journalist/SubmitNews'
import AIDraftPreview from './journalist/AIDraftPreview'

import AdminDashboard from './admin/Dashboard'
import Approvals from './admin/Approvals'
import ManageJournalists from './admin/ManageJournalists'
import UploadNews from './admin/UploadNews'
import ManageNews from './admin/ManageNews'
import AdLeads from './admin/AdLeads'
import Withdrawals from './admin/Withdrawals'

function JournalistArea() {
  const { isJournalist } = useAuth()
  return isJournalist ? <JournalistDashboard /> : <Profile />
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <SplashLoader />

  return (
    <>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route path="/journalist" element={<JournalistArea />} />
        <Route path="/journalist/submit" element={<SubmitNews />} />
        <Route path="/journalist/preview" element={<AIDraftPreview />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/approvals" element={<Approvals />} />
        <Route path="/admin/journalists" element={<ManageJournalists />} />
        <Route path="/admin/upload" element={<UploadNews />} />
        <Route path="/admin/manage-news" element={<ManageNews />} />
        <Route path="/admin/ad-leads" element={<AdLeads />} />
        <Route path="/admin/withdrawals" element={<Withdrawals />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}

function SplashLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--nf-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src="/icons/icon-128.png" alt="NewsFlow" style={{ width: 80, height: 80, opacity: 0.9 }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
