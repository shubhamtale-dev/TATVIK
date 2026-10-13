import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { ReviewPage } from './pages/ReviewPage';
import { ResearchVerificationPage } from './pages/ResearchVerificationPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="quality" element={<DataQualityPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="verification" element={<ResearchVerificationPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <AuthModal />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

