import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CustomerMaster from './pages/CustomerMaster'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import ProjectForm from './pages/ProjectForm'
import Users from './pages/Users'
import AuditSecurity from './pages/AuditSecurity'
import TallyExport from './pages/TallyExport'
import About from './pages/About'
import ChangePassword from './pages/ChangePassword'
import ResetPassword from './pages/ResetPassword'
import SupportTicketsDashboard from './pages/SupportTicketsDashboard'
import Help from './pages/Help'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="customers" element={<ErrorBoundary><CustomerMaster /></ErrorBoundary>} />
            <Route path="projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
            <Route path="projects/new" element={<ErrorBoundary><ProjectForm /></ErrorBoundary>} />
            <Route path="projects/:id" element={<ErrorBoundary><ProjectDetail /></ErrorBoundary>} />
            <Route path="projects/:id/edit" element={<ErrorBoundary><ProjectForm /></ErrorBoundary>} />
            <Route path="users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
            <Route path="audit-security" element={<ErrorBoundary><AuditSecurity /></ErrorBoundary>} />
            <Route path="tally-export" element={<ErrorBoundary><TallyExport /></ErrorBoundary>} />
            <Route path="support-tickets" element={<ErrorBoundary><SupportTicketsDashboard /></ErrorBoundary>} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route 
              path="help" 
              element={
                <ErrorBoundary>
                  <Help />
                </ErrorBoundary>
              } 
            />
            <Route 
              path="help/:section" 
              element={
                <ErrorBoundary>
                  <Help />
                </ErrorBoundary>
              } 
            />
            <Route path="about" element={<ErrorBoundary><About /></ErrorBoundary>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
