import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';

export const ClientRegisterPage: React.FC = () => {
  const { registerSyndic } = useAuth();
  const navigate = useNavigate();

  const [condoName, setCondoName] = useState('');
  const [syndicName, setSyndicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await registerSyndic({
        condo_name: condoName,
        syndic_name: syndicName,
        email,
        password,
      });
      navigate('/app/prestacao-contas', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setSubmitting(false);
    }
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
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#1A73E9] hover:underline mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao login</span>
          </Link>

          <h1 className="text-lg font-semibold tracking-tight mb-1">Cadastro de Síndico</h1>
          <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mb-5">
            Estruture imediatamente o plano de contas do condomínio
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2.5 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Nome do Condomínio</label>
              <input
                type="text"
                required
                value={condoName}
                onChange={(e) => setCondoName(e.target.value)}
                placeholder="Ex: Edifício Horizonte Azul"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Nome do Síndico</label>
              <input
                type="text"
                required
                value={syndicName}
                onChange={(e) => setSyndicName(e.target.value)}
                placeholder="Nome completo"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sindico@condominio.com.br"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 mt-1 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {submitting ? 'Criando acesso...' : 'Concluir Cadastro'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
