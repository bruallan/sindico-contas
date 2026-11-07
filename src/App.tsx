import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FinancialDataProvider } from '@/contexts/FinancialDataContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ClientLoginPage } from '@/pages/auth/ClientLoginPage';
import { ClientRegisterPage } from '@/pages/auth/ClientRegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ClientAppLayout } from '@/layouts/ClientAppLayout';
import { WelcomePage } from '@/pages/client/WelcomePage';
import { AccountabilityPage } from '@/pages/client/AccountabilityPage';
import { TransactionsPage } from '@/pages/client/TransactionsPage';

const RootRedirect: React.FC = () => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (session?.role === 'syndic') return <Navigate to="/app/prestacao-contas" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            {/* Rotas Públicas de Autenticação (Separadas: Cliente vs Admin) */}
            <Route path="/login" element={<ClientLoginPage />} />
            <Route path="/cadastro" element={<ClientRegisterPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Módulo Administrador */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Módulo do Cliente / Síndico */}
            <Route
              path="/app"
              element={
                <ProtectedRoute requiredRole="syndic">
                  <FinancialDataProvider>
                    <ClientAppLayout />
                  </FinancialDataProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<WelcomePage />} />
              <Route path="prestacao-contas" element={<AccountabilityPage />} />
              <Route path="lancamentos" element={<TransactionsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
