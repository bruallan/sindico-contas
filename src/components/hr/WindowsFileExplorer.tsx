import React, { useMemo, useState } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Download,
  Trash2,
  Edit2,
  Copy,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  Search,
  HardDrive,
  File,
  X,
  Upload,
  Calendar,
} from 'lucide-react';
import { useHrData } from '@/contexts/HrDataContext';
import { ExplorerItem } from '@/types/hr';

interface WindowsFileExplorerProps {
  initialFolderId?: string | null;
  isModal?: boolean;
  onClose?: () => void;
  title?: string;
}

export const WindowsFileExplorer: React.FC<WindowsFileExplorerProps> = ({
  initialFolderId = null,
  isModal = false,
  onClose,
  title = 'Explorador de Documentos do Condomínio',
}) => {
  const {
    bundle,
    createExplorerFolder,
    createExplorerFile,
    renameExplorerItem,
    deleteExplorerItem,
    copyExplorerItem,
  } = useHrData();

  const items = bundle?.file_explorer_items || [];

  // Current folder
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  // Navigation history
  const [history, setHistory] = useState<(string | null)[]>([initialFolderId]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Selected item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileExpiry, setNewFileExpiry] = useState<string>('');
  const [newFileDescription, setNewFileDescription] = useState<string>('');

  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameValue, setRenameValue] = useState<string>('');

  const [previewItem, setPreviewItem] = useState<ExplorerItem | null>(null);

  // Expanded folders in sidebar tree
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root-funcionarios'])
  );

  const navigateTo = (folderId: string | null) => {
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push(folderId);
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
    setCurrentFolderId(folderId);
    setSelectedItemId(null);
  };

  const navigateBack = () => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setCurrentFolderId(history[nextIdx]);
      setSelectedItemId(null);
    }
  };

  const navigateUp = () => {
    if (!currentFolderId) return;
    const currentItem = items.find((it) => it.id === currentFolderId);
    navigateTo(currentItem?.parent_id ?? null);
  };

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Breadcrumb items
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Raiz' }];
    if (!currentFolderId) return path;

    const chain: { id: string; name: string }[] = [];
    let curr: ExplorerItem | undefined = items.find((it) => it.id === currentFolderId);
    while (curr) {
      chain.unshift({ id: curr.id, name: curr.name });
      curr = curr.parent_id ? items.find((it) => it.id === curr?.parent_id) : undefined;
    }
    return [...path, ...chain];
  }, [currentFolderId, items]);

  // Current folder items
  const currentItems = useMemo(() => {
    let list = items.filter((it) => {
      if (searchQuery.trim()) {
        return it.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return it.parent_id === currentFolderId;
    });

    // Sort: folders first, then files alphabetically
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [items, currentFolderId, searchQuery]);

  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedItemId);
  }, [items, selectedItemId]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    // determine employeeId if inside an employee folder
    let empId: string | null = null;
    let curr = items.find((it) => it.id === currentFolderId);
    while (curr) {
      if (curr.employee_id) {
        empId = curr.employee_id;
        break;
      }
      curr = curr.parent_id ? items.find((it) => it.id === curr?.parent_id) : undefined;
    }

    createExplorerFolder(currentFolderId, newFolderName.trim(), empId);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    let empId: string | null = null;
    let curr = items.find((it) => it.id === currentFolderId);
    while (curr) {
      if (curr.employee_id) {
        empId = curr.employee_id;
        break;
      }
      curr = curr.parent_id ? items.find((it) => it.id === curr?.parent_id) : undefined;
    }

    createExplorerFile(currentFolderId, {
      name: newFileName.trim(),
      extension: newFileName.includes('.') ? newFileName.split('.').pop() : 'pdf',
      expiry_date: newFileExpiry || null,
      content_description: newFileDescription || undefined,
      employee_id: empId,
    });
    setNewFileName('');
    setNewFileExpiry('');
    setNewFileDescription('');
    setShowNewFileModal(false);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !renameValue.trim()) return;
    renameExplorerItem(selectedItemId, renameValue.trim());
    setShowRenameModal(false);
    setRenameValue('');
  };

  const handleDelete = () => {
    if (!selectedItemId) return;
    if (confirm(`Deseja excluir "${selectedItem?.name}"? Esta ação removerá o item.`)) {
      deleteExplorerItem(selectedItemId);
      setSelectedItemId(null);
    }
  };

  const handleCopy = () => {
    if (!selectedItemId) return;
    copyExplorerItem(selectedItemId, currentFolderId);
  };

  const handleDownload = (item: ExplorerItem) => {
    const dummyBlob = new Blob(
      [
        `SÍNDICO CONTAS - SISTEMA DE GESTÃO DE ARQUIVOS E DOCUMENTOS\n\n` +
          `Item: ${item.name}\n` +
          `Tipo: ${item.type}\n` +
          `Modificado em: ${item.updated_at}\n` +
          `Validade: ${item.expiry_date || 'N/A'}\n` +
          `Descrição: ${item.content_description || 'Sem descrição'}\n\n` +
          `Este é um arquivo de demonstração oficial exportado pelo sistema.`,
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name.includes('.') ? item.name : `${item.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />;
    }
    const ext = item.extension?.toLowerCase() || '';
    if (ext === 'pdf') {
      return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    return <File className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  // Render tree item recursively
  const renderTreeItem = (parentId: string | null = null, depth = 0) => {
    const folders = items.filter((it) => it.type === 'folder' && it.parent_id === parentId);
    if (!folders.length) return null;

    return (
      <div className="space-y-0.5">
        {folders.map((f) => {
          const hasChildren = items.some((it) => it.type === 'folder' && it.parent_id === f.id);
          const isExpanded = expandedFolders.has(f.id);
          const isSelected = currentFolderId === f.id;

          return (
            <div key={f.id}>
              <div
                onClick={() => navigateTo(f.id)}
                className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none rounded-none text-xs transition-colors ${
                  isSelected
                    ? 'bg-slate-200 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => toggleFolderExpand(f.id, e)}
                    className="p-0.5 hover:text-slate-900 dark:hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5" />
                )}
                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{f.name}</span>
              </div>
              {hasChildren && isExpanded && renderTreeItem(f.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const containerContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none shadow-sm text-xs text-slate-800 dark:text-slate-200 overflow-hidden font-sans">
      {/* Title Bar (WinRAR / Explorer Style) */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            {title}
          </span>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-750">
        <div className="flex items-center gap-1">
          <button
            onClick={navigateBack}
            disabled={historyIdx <= 0}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Voltar"
          >
            <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
          </button>
          <button
            onClick={navigateUp}
            disabled={!currentFolderId}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Subir Nível"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
            Nova Pasta
          </button>

          <button
            onClick={() => setShowNewFileModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            Adicionar Arquivo
          </button>

          <button
            onClick={() => {
              if (selectedItem) {
                setRenameValue(selectedItem.name);
                setShowRenameModal(true);
              }
            }}
            disabled={!selectedItemId}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            Renomear
          </button>

          <button
            onClick={handleCopy}
            disabled={!selectedItemId}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            Copiar
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedItemId}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-700 dark:hover:bg-red-950/40 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>

          <button
            onClick={() => {
              if (selectedItem) handleDownload(selectedItem);
            }}
            disabled={!selectedItemId}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            Baixar
          </button>
        </div>

        {/* Search */}
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar arquivos..."
            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-slate-500 rounded-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Path Bar */}
      <div className="flex items-center gap-1 px-3 py-1 bg-slate-100/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 overflow-x-auto text-[11px]">
        <span className="font-semibold text-slate-500 shrink-0">Caminho:</span>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.id || 'root'}>
            {idx > 0 && <span className="text-slate-400 select-none">/</span>}
            <button
              onClick={() => navigateTo(bc.id)}
              className="hover:underline hover:text-slate-900 dark:hover:text-white shrink-0 font-mono"
            >
              {bc.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Main Content Pane: Left Tree + Right Table */}
      <div className="flex flex-1 min-h-[360px] overflow-hidden">
        {/* Left Tree Explorer */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-750 overflow-y-auto bg-slate-50/50 dark:bg-slate-850/30 p-2 shrink-0">
          <div
            onClick={() => navigateTo(null)}
            className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none rounded-none text-xs transition-colors mb-1 ${
              currentFolderId === null
                ? 'bg-slate-200 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span className="truncate">Raiz do Condomínio</span>
          </div>
          {renderTreeItem(null, 0)}
        </div>

        {/* Right Details Grid */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-750 font-medium select-none sticky top-0 z-10">
                <th className="py-2 px-3">Nome</th>
                <th className="py-2 px-3 w-28">Tipo</th>
                <th className="py-2 px-3 w-32">Modificado em</th>
                <th className="py-2 px-3 w-24">Tamanho</th>
                <th className="py-2 px-3 w-28">Validade</th>
                <th className="py-2 px-3 w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Pasta vazia. Use os botões acima para adicionar pastas ou arquivos.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const isFolder = item.type === 'folder';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      onDoubleClick={() => {
                        if (isFolder) navigateTo(item.id);
                        else setPreviewItem(item);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-950 font-medium dark:bg-blue-950/40 dark:text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(item)}
                          <span className="truncate max-w-sm">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-500 uppercase text-[10px] font-mono">
                        {isFolder ? 'Pasta de Arquivos' : item.extension || 'Arquivo'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {item.updated_at?.slice(0, 10) || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {isFolder ? '-' : `${Math.round((item.size_bytes || 120000) / 1024)} KB`}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">
                        {item.expiry_date ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              item.expiry_date < new Date().toISOString().slice(0, 10)
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Calendar className="w-3 h-3 shrink-0" />
                            {item.expiry_date}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isFolder && (
                            <button
                              onClick={() => setPreviewItem(item)}
                              className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                              title="Visualizar / Abrir"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(item)}
                            className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            title="Baixar Arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-750 text-[11px] text-slate-500">
        <div>
          <span>{currentItems.length} item(ns)</span>
          {selectedItem && (
            <span className="ml-3 font-medium text-slate-700 dark:text-slate-300">
              Selecionado: {selectedItem.name}
            </span>
          )}
        </div>
        <div className="font-mono">Ficheiro Digital • Condomínio</div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFolder}
            className="bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 p-4 w-full max-w-sm space-y-3 shadow-lg"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Criar Nova Pasta
            </h3>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Nome da pasta
              </label>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Documentos Fiscais"
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-3 py-1 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFile}
            className="bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 p-4 w-full max-w-md space-y-3 shadow-lg"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Adicionar Arquivo / Documento
            </h3>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Nome do arquivo (com extensão)
              </label>
              <input
                type="text"
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Ex: Exame_Periodico_2026.pdf"
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Data de Validade (opcional)
              </label>
              <input
                type="date"
                value={newFileExpiry}
                onChange={(e) => setNewFileExpiry(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Observações ou conteúdo
              </label>
              <input
                type="text"
                value={newFileDescription}
                onChange={(e) => setNewFileDescription(e.target.value)}
                placeholder="Ex: Atestado emitido por Clínica Santa Maria"
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newFileName.trim()}
                className="px-3 py-1 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs disabled:opacity-50"
              >
                Salvar Arquivo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRename}
            className="bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 p-4 w-full max-w-sm space-y-3 shadow-lg"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Renomear Item</h3>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Novo nome
              </label>
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim()}
                className="px-3 py-1 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {getFileIcon(previewItem)}
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {previewItem.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs uppercase text-slate-400 font-semibold mb-2">
                  Metadados do Arquivo
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Nome original:</dt>
                    <dd className="font-medium text-slate-900 dark:text-white">
                      {previewItem.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tipo de formato:</dt>
                    <dd className="font-mono text-slate-900 dark:text-white uppercase">
                      {previewItem.extension || 'Arquivo'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Data de registro:</dt>
                    <dd className="font-mono text-slate-900 dark:text-white">
                      {previewItem.updated_at}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Validade jurídica:</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                      {previewItem.expiry_date || 'Não se aplica / Indeterminada'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[140px] flex flex-col justify-center items-center text-center">
                <FileText className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Visualização Digital do Documento
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                  {previewItem.content_description ||
                    'Documento arquivado no prontuário eletrônico do condomínio com autenticidade verificada.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 font-mono">
                Status: Autenticado eletronicamente
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewItem)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Arquivo
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-700 text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col">{containerContent}</div>
      </div>
    );
  }

  return <div className="w-full h-full min-h-[550px]">{containerContent}</div>;
};
