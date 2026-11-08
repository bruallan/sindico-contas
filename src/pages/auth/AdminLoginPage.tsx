import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { CentriaxLogo } from '@/components/CentriaxLogo';

export const AdminLoginPage: React.FC = () => {
  const { session, loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('brunoallan004@gmail.com');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginAdmin(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação master.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#E6EAED] dark:bg-[#0E1B2B] text-[#0E1B2B] dark:text-[#E6EAED]">
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <CentriaxLogo size="md" />
        <ThemeToggleButton />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-7 shadow-sm">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Console Administrativo</h1>
              <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mt-1">
                SGC — Gestão Central e Autorização de Condomínios
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-[#0E1B2B] dark:bg-[#1A73E9] flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3.5 py-3 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">E-mail Master Autorizado</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brunoallan004@gmail.com"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">Chave de Acesso / Senha</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>{submitting ? 'Autenticando Master...' : 'Acessar Painel Master'}</span>
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-[11px] leading-relaxed text-[#0E1B2B]/70 dark:text-[#E6EAED]/70">
            <span className="font-semibold text-[#1A73E9]">Dica de Primeiro Acesso:</span> Digite a senha que deseja cadastrar para o administrador master e clique em <em>Acessar Painel Master</em>. Caso o Supabase exija confirmação de e-mail, verifique a caixa de entrada do seu Gmail ou desligue &quot;Confirm email&quot; no painel Supabase.
          </div>
        </div>
      </main>
    </div>
  );
};
