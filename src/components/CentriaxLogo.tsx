import React from 'react';
import { CENTRIAX_LOGO_BASE64 } from '@/logoCentriax';

interface CentriaxLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CentriaxLogo: React.FC<CentriaxLogoProps> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
}) => {
  const imgHeights = {
    sm: 'h-6',
    md: 'h-7',
    lg: 'h-9',
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Container com fundo branco arredondado para garantir contraste perfeito em Dark e Light Mode */}
      <div className="bg-white px-2.5 py-1 rounded-lg border border-[#0E1B2B]/10 shadow-sm flex items-center justify-center shrink-0">
        <img
          src={CENTRIAX_LOGO_BASE64}
          alt="Centriax"
          className={`${imgHeights[size]} w-auto object-contain select-none`}
        />
      </div>

      {showSubtitle && (
        <div className="min-w-0 flex flex-col justify-center leading-tight">
          <span className="font-bold text-sm tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
            SGS
          </span>
          <span className="text-[10px] font-medium text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 truncate">
            Sistema de Gestão Sindical
          </span>
        </div>
      )}
    </div>
  );
};
