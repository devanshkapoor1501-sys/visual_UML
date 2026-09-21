import { Copy, FilePlus2, Grid3X3, Magnet, Scan, Trash2 } from 'lucide-react';

export type ContextMenuItem = { label: string; icon?: React.ReactNode; shortcut?: string; disabled?: boolean; onClick: () => void };

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }) {
  return <div className="context-menu" style={{ left: x, top: y }} role="menu" onMouseDown={(event) => event.stopPropagation()}>
    {items.map((item, index) => <button key={`${item.label}-${index}`} role="menuitem" disabled={item.disabled} onClick={() => { item.onClick(); onClose(); }}><span className="context-icon">{item.icon}</span><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>)}
  </div>;
}

export const contextIcons = { add: <FilePlus2 size={14} />, duplicate: <Copy size={14} />, delete: <Trash2 size={14} />, fit: <Scan size={14} />, grid: <Grid3X3 size={14} />, snap: <Magnet size={14} /> };
