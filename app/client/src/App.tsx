/**
 * App root: router + providers.
 *   "/"           -> Landing (public)
 *   "/login"      -> admin login
 *   "/dashboard"  -> ProtectedRoute(Dashboard)
 *   public proof surfaces: /map /tree/:id /carbon /verify /sponsor/:id /portal/:id /audit/pnb /field
 *
 * Routes are LAZY-loaded (React.lazy) so the heavy deps — Leaflet + markercluster
 * (the map), qrcode (tree plaque), the admin dashboard — ship as separate chunks
 * fetched only when that route opens. Initial load drops from one ~700 KB bundle
 * to a small shell + per-route chunks.
 */
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/Toast';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicMap = lazy(() => import('./pages/PublicMap'));
const Landing = lazy(() => import('./pages/Landing'));
const TreeProof = lazy(() => import('./pages/TreeProof'));
const Field = lazy(() => import('./pages/Field'));
const Carbon = lazy(() => import('./pages/Carbon'));
const Verify = lazy(() => import('./pages/Verify'));
const Sponsor = lazy(() => import('./pages/Sponsor'));
const SponsorPortal = lazy(() => import('./pages/SponsorPortal'));
const AuditPnb = lazy(() => import('./pages/AuditPnb'));
const ForestTourPage = lazy(() => import('./pages/ForestTourPage'));
const ForestPage = lazy(() => import('./pages/ForestPage'));
const ReportSponsor = lazy(() => import('./pages/ReportSponsor'));
const ReportTree = lazy(() => import('./pages/ReportTree'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Branded fallback while a route chunk loads (matches the dark Living Instrument shell).
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16282e' }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#b6ff3c', boxShadow: '0 0 16px rgba(182,255,60,.8)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}`}</style>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/map" element={<PublicMap />} />
                <Route path="/tree/:id" element={<TreeProof />} />
                <Route path="/field" element={<Field />} />
                <Route path="/carbon" element={<Carbon />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/sponsor/:id" element={<Sponsor />} />
                <Route path="/portal/:id" element={<SponsorPortal />} />
                <Route path="/audit/pnb" element={<AuditPnb />} />
              <Route path="/forest/:id" element={<ForestPage />} />
              <Route path="/forest/:id/tour" element={<ForestTourPage />} />
              <Route path="/report/sponsor/:id" element={<ReportSponsor />} />
              <Route path="/report/tree/:id" element={<ReportTree />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
