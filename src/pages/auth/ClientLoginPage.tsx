import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, Building2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { CentriaxLogo } from '@/components/CentriaxLogo';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Client } from '@/types/database';

export const ClientLoginPage: React.FC = () => {
  const { session, loginSyndic, selectCondominium } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Etapa 2: Seleção caso o síndico gerencie 2 ou mais condomínios
  const [step, setStep] = useState<'credentials' | 'select-condo'>('credentials');
  const [availableCondos, setAvailableCondos] = useState<Client[]>([]);
  const [chosenCondoId, setChosenCondoId] = useState<string>('');

  if (session?.role === 'syndic' && step === 'credentials') {
    return <Navigate to="/app/prestacao-contas" replace />;
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const authSession = await loginSyndic(email, password);
      // Se possui mais de um condomínio ativo, exibe a tela com o menu suspenso para escolha
      if (authSession.availableClients && authSession.availableClients.length > 1) {
        setAvailableCondos(authSession.availableClients);
        setChosenCondoId(authSession.availableClients[0].id);
        setStep('select-condo');
      } else {
        navigate('/app/prestacao-contas', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCondoSelectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = availableCondos.find((c) => c.id === chosenCondoId) ?? availableCondos[0];
    if (target) {
      selectCondominium(target);
      navigate('/app/prestacao-contas', { replace: true });
    }
  };

  const fillDemoSingleCondo = () => {
    setEmail('marina@residencialaurora.com.br');
    setPassword('123456');
    setError(null);
    setStep('credentials');
  };

  const fillDemoMultiCondo = () => {
    setEmail('sindico@jardins.com.br');
    setPassword('123456');
    setError(null);
    setStep('credentials');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#E6EAED] dark:bg-[#0E1B2B] text-[#0E1B2B] dark:text-[#E6EAED]">
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <CentriaxLogo size="md" />
        <ThemeToggleButton />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-7 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3.5 py-3 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <>
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight">Acesso do Síndico</h1>
                <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mt-1">
                  SGS — Sistema de Gestão Sindical e Prestação de Contas
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
                  <span>{submitting ? 'Verificando autorização...' : 'Entrar'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Garantia Visual de Autorização / Whitelist Fechada */}
              <div className="mt-5 pt-4 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-start gap-2 text-[11px] opacity-70">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2AC38B] shrink-0 mt-0.5" />
                <span>
                  Ambiente seguro. Acesso restrito a síndicos previamente cadastrados pelo administrador do sistema.
                </span>
              </div>

              {!isSupabaseConfigured && (
                <div className="mt-4 pt-3 border-t border-dashed border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex flex-col gap-1.5 text-[11px] opacity-75">
                  <span className="font-semibold text-[#0E1B2B] dark:text-[#E6EAED]">Testar no Modo Demo:</span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={fillDemoSingleCondo}
                      className="text-[#1A73E9] hover:underline font-medium text-left"
                    >
                      • Síndica de 1 condomínio
                    </button>
                    <button
                      type="button"
                      onClick={fillDemoMultiCondo}
                      className="text-[#1A73E9] hover:underline font-medium text-left"
                    >
                      • Síndico de 2+ condomínios
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ETAPA 2: Seleção de Condomínio (Menu Suspenso) */
            <form onSubmit={handleCondoSelectionSubmit} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1A73E9] hover:underline mb-3"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar / Trocar e-mail</span>
                </button>

                <h1 className="text-lg font-semibold tracking-tight">Selecione o Condomínio</h1>
                <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65 mt-1">
                  Identificamos <strong>{availableCondos.length} condomínios ativos</strong> vinculados ao seu e-mail:
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Condomínio que deseja gerenciar
                </label>
                <div className="relative">
                  <select
                    value={chosenCondoId}
                    onChange={(e) => setChosenCondoId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg text-xs font-medium bg-[#E6EAED]/60 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9] transition-colors appearance-none cursor-pointer"
                  >
                    {availableCondos.map((condo) => (
                      <option
                        key={condo.id}
                        value={condo.id}
                        className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
                      >
                        {condo.condo_name} ({condo.syndic_name})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
                    <Building2 className="h-4 w-4 text-[#1A73E9]" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 mt-2 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>Acessar Condomínio</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
