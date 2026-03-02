import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                   element={<Dashboard />} />
        <Route path="/customers"          element={<Customers />} />
        <Route path="/customers/:id"      element={<CustomerWorkspace />} />
        <Route path="/costing"            element={<CostingSheet />} />
        <Route path="/bom"                element={<BOMSheet />} />
        <Route path="/roi"                element={<ROICalculator />} />
        <Route path="/proposal"           element={<ProposalPreview />} />
        <Route path="/help"               element={<HelpPage />} />
        <Route path="/about"              element={<AboutPage />} />
        <Route path="*"                   element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
