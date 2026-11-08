import React from 'react';

interface CentriaxLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  collapsedIconOnly?: boolean;
}

export const CentriaxLogo: React.FC<CentriaxLogoProps> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
  collapsedIconOnly = false,
}) => {
  const fontSizes = {
    sm: 'text-[17px]',
    md: 'text-[24px]',
    lg: 'text-[30px]',
  };

  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-3.5',
  };

  const paddingLeftSizes = {
    sm: 'pl-2',
    md: 'pl-3',
    lg: 'pl-3.5',
  };

  const sgcFontSizes = {
    sm: 'text-xs',
    md: 'text-[13px]',
    lg: 'text-sm',
  };

  const subFontSizes = {
    sm: 'text-[8.5px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
  };

  // Modo ícone compacto para menu lateral recolhido
  if (collapsedIconOnly) {
    return (
      <div
        className={`h-9 w-9 rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 shadow-sm flex items-center justify-center select-none ${className}`}
        title="Centriax - SGC"
      >
        <span className="font-extrabold text-sm tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
          c<span className="text-[#1A73E9]">x</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${gapSizes[size]} select-none min-w-0 ${className}`}>
      {/* Logo Centriax Tipográfica Nativa em Alta Definição */}
      <div className="flex items-center shrink-0 leading-none">
        <span
          className={`${fontSizes[size]} font-bold select-none leading-none tracking-[-0.035em]`}
          style={{ fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          <span className="text-[#3D3D42] dark:text-[#F3F4F6]">centria</span>
          <span className="text-[#1A73E9] dark:text-[#38BDF8]">x</span>
        </span>
      </div>

      {showSubtitle && (
        <div className={`flex items-center ${paddingLeftSizes[size]} border-l border-[#0E1B2B]/20 dark:border-[#E6EAED]/20 min-w-0`}>
          <div className="min-w-0 flex flex-col justify-center leading-tight">
            <span className={`font-bold ${sgcFontSizes[size]} tracking-tight text-[#0E1B2B] dark:text-[#E6EAED] leading-none mb-0.5 whitespace-nowrap`}>
              SGC
            </span>
            {size === 'sm' ? (
              <span className="text-[8.5px] font-medium text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 leading-[1.15]">
                Sistema de Gestão
                <br />
                Condominial
              </span>
            ) : (
              <span className={`${subFontSizes[size]} font-medium text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 leading-tight whitespace-nowrap`}>
                Sistema de Gestão Condominial
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
