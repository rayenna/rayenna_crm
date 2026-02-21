import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'
import PageLoader from './components/PageLoader'
import Layout from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CustomerMaster = lazy(() => import('./pages/CustomerMaster'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const ProjectForm = lazy(() => import('./pages/ProjectForm'))
const Users = lazy(() => import('./pages/Users'))
const AuditSecurity = lazy(() => import('./pages/AuditSecurity'))
const TallyExport = lazy(() => import('./pages/TallyExport'))
const About = lazy(() => import('./pages/About'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const SupportTicketsDashboard = lazy(() => import('./pages/SupportTicketsDashboard'))
const Help = lazy(() => import('./pages/Help'))

function App() {
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false
      const node = el as HTMLElement
      const tag = node.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return true
      if (node.isContentEditable) return true
      return false
    }

    const handleCopy = (e: ClipboardEvent) => {
      if (!isEditable(document.activeElement)) e.preventDefault()
    }
    const handleCut = (e: ClipboardEvent) => {
      if (!isEditable(document.activeElement)) e.preventDefault()
    }
    const handlePaste = (e: ClipboardEvent) => {
      if (!isEditable(document.activeElement)) e.preventDefault()
    }
    const handleContextMenu = (e: MouseEvent) => {
      if (!isEditable(e.target as HTMLElement)) e.preventDefault()
    }

    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route
            path="/login"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}><Login /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="/reset-password"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="customers"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><CustomerMaster /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projects"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><Projects /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projects/new"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><ProjectForm /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projects/:id"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projects/:id/edit"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><ProjectForm /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="users"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><Users /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="audit-security"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><AuditSecurity /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="tally-export"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><TallyExport /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="support-tickets"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><SupportTicketsDashboard /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="change-password"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><ChangePassword /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="help"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><Help /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="help/:section"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><Help /></Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="about"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}><About /></Suspense>
                </ErrorBoundary>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
