import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { isSupabaseConfigured } from '@/lib/supabase';

export const ClientLoginPage: React.FC = () => {
  const { session, loginSyndic } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.role === 'syndic') {
    return <Navigate to="/app/prestacao-contas" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginSyndic(email, password);
      navigate('/app/prestacao-contas', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('sindico@jardins.com.br');
    setPassword('123456');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#E6EAED] dark:bg-[#0E1B2B] text-[#0E1B2B] dark:text-[#E6EAED]">
      <header className="w-full max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#1A73E9] flex items-center justify-center text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight text-sm">SíndicoContas</span>
        </div>
        <ThemeToggleButton />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-7 shadow-sm">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight">Acesso do Síndico</h1>
            <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mt-1">
              Gestão financeira e prestação de contas condominial
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2.5 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sindico@condominio.com.br"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium opacity-80">Senha</label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-[#1A73E9] hover:underline font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>
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
              className="w-full h-10 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>{submitting ? 'Autenticando...' : 'Entrar'}</span>
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-center text-xs">
            <span className="opacity-70">Novo condomínio? </span>
            <Link to="/cadastro" className="text-[#1A73E9] font-medium hover:underline">
              Cadastre-se
            </Link>
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-4 pt-3 border-t border-dashed border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-center justify-between text-[11px] opacity-75">
              <span>Ambiente demonstrativo</span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-[#1A73E9] font-medium hover:underline"
              >
                Preencher síndico demo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
