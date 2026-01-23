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
import TallyExport from './pages/TallyExport'
import About from './pages/About'
import ChangePassword from './pages/ChangePassword'
import SupportTicketsDashboard from './pages/SupportTicketsDashboard'
import Help from './pages/Help'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<CustomerMaster />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<ProjectForm />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/edit" element={<ProjectForm />} />
            <Route path="users" element={<Users />} />
            <Route path="tally-export" element={<TallyExport />} />
            <Route path="support-tickets" element={<SupportTicketsDashboard />} />
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
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
