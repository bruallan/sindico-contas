import React from 'react';
import { WindowsFileExplorer } from '@/components/hr/WindowsFileExplorer';
import { useAuth } from '@/contexts/AuthContext';

export const DocumentsPage: React.FC = () => {
  const { session } = useAuth();
  const condoName = session?.client?.condo_name || 'Condomínio Residencial';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Documentos e Ficheiro Central
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {condoName} • Repositório de Documentos Fiscais, Jurídicos, Laudos e Prontuários
          </p>
        </div>
      </div>

      <div className="h-[calc(100vh-210px)] min-h-[580px]">
        <WindowsFileExplorer
          initialFolderId={null}
          title="Ficheiro Central • Explorer do Condomínio"
        />
      </div>
    </div>
  );
};
