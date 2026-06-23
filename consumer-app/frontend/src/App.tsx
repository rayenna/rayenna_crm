import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthProvider } from '@/contexts/AuthContext'
import PrivateRoute from '@/components/PrivateRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Track from '@/pages/Track'
import Maintain from '@/pages/Maintain'
import Support from '@/pages/Support'
import Help from '@/pages/Help'
import HelpArticle from '@/pages/HelpArticle'
import Profile from '@/pages/Profile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="track" element={<Track />} />
                <Route path="maintain" element={<Maintain />} />
                <Route path="support" element={<Support />} />
                <Route path="help" element={<Help />} />
                <Route path="help/:articleId" element={<HelpArticle />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
