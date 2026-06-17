/**
 * App root: router + providers.
 *   "/"           -> Login
 *   "/dashboard"  -> ProtectedRoute(Dashboard)
 *   anything else -> redirect to "/"
 *
 * Providers: React Query (entity list caching), Auth (session), Toast.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicMap from './pages/PublicMap';
import Landing from './pages/Landing';
import TreeProof from './pages/TreeProof';
import Field from './pages/Field';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Entity lists are cached per spec ("results cached client-side so
      // re-selecting does not refetch"). Tune per-query in module agents.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/map" element={<PublicMap />} />
              <Route path="/tree/:id" element={<TreeProof />} />
              <Route path="/field" element={<Field />} />
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
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
