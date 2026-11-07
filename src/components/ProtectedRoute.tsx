import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

interface ProtectedRouteProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E6EAED] dark:bg-[#0E1B2B]">
        <div className="h-6 w-6 rounded-full border-2 border-[#1A73E9] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to={requiredRole === 'admin' ? '/admin/login' : '/login'} replace />;
  }

  if (session.role !== requiredRole) {
    return <Navigate to={session.role === 'admin' ? '/admin/dashboard' : '/app/prestacao-contas'} replace />;
  }

  return <>{children}</>;
};
