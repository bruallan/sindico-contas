import React from 'react';
import { CalendarRange } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHrData } from '@/contexts/HrDataContext';
import { CondoCalendarSection } from '@/components/hr/CondoCalendarSection';

export const CondoCalendarPage: React.FC = () => {
  const { session } = useAuth();
  const { bundle, loading } = useHrData();

  if (loading || !bundle) {
    return (
      <div className="h-64 rounded-xl bg-white/50 dark:bg-[#15263B]/50 animate-pulse border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A73E9]">
            <CalendarRange className="h-4 w-4" />
            <span>Central de Datas, Eventos e Vencimentos</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Calendário Geral — {session?.client?.condo_name}
          </h1>
          <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
            Aniversários dos {bundle.employees.length} colaboradores, reservas do salão de festas, vencimentos de exames/certificados, laudos prediais e contratos.
          </p>
        </div>
      </div>

      <CondoCalendarSection />
    </div>
  );
};
