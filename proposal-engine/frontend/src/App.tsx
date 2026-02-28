import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CostingSheet from './pages/CostingSheet';
import BOMSheet from './pages/BOMSheet';
import ROICalculator from './pages/ROICalculator';
import ProposalPreview from './pages/ProposalPreview';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/costing" element={<CostingSheet />} />
        <Route path="/bom" element={<BOMSheet />} />
        <Route path="/roi" element={<ROICalculator />} />
        <Route path="/proposal" element={<ProposalPreview />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
