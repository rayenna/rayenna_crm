import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerWorkspace from './pages/CustomerWorkspace';
import CostingSheet from './pages/CostingSheet';
import BOMSheet from './pages/BOMSheet';
import ROICalculator from './pages/ROICalculator';
import ProposalPreview from './pages/ProposalPreview';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import { getToken } from './lib/apiClient';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <Customers />
            </RequireAuth>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <RequireAuth>
              <CustomerWorkspace />
            </RequireAuth>
          }
        />
        <Route
          path="/costing"
          element={
            <RequireAuth>
              <CostingSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/bom"
          element={
            <RequireAuth>
              <BOMSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/roi"
          element={
            <RequireAuth>
              <ROICalculator />
            </RequireAuth>
          }
        />
        <Route
          path="/proposal"
          element={
            <RequireAuth>
              <ProposalPreview />
            </RequireAuth>
          }
        />
        <Route
          path="/help"
          element={
            <RequireAuth>
              <HelpPage />
            </RequireAuth>
          }
        />
        <Route
          path="/about"
          element={
            <RequireAuth>
              <AboutPage />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <RequireAuth>
              <NotFound />
            </RequireAuth>
          }
        />
      </Routes>
    </Layout>
  );
}
