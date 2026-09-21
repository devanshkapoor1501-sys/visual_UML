import { useEffect, useMemo, useState } from 'react';
import { Command, Search } from 'lucide-react';

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
};

export function CommandPalette({ commands, onClose }: { commands: PaletteCommand[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => commands.filter((command) => `${command.label} ${command.group}`.toLowerCase().includes(query.toLowerCase())), [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(0, filtered.length - 1))); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
      if (event.key === 'Enter' && filtered[activeIndex]) { event.preventDefault(); filtered[activeIndex].run(); onClose(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose]);

  return <div className="modal-scrim command-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="command-search"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands…" /><kbd>Esc</kbd></div>
      <div className="command-list">
        {filtered.length === 0 && <div className="command-empty">No matching commands</div>}
        {filtered.map((command, index) => <button key={command.id} className={`command-item ${index === activeIndex ? 'active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => { command.run(); onClose(); }}>
          <span className="command-icon"><Command size={14} /></span><span className="command-copy"><strong>{command.label}</strong><small>{command.group}</small></span>{command.hint && <kbd>{command.hint}</kbd>}
        </button>)}
      </div>
      <div className="command-footer"><span>↑↓ Navigate</span><span>↵ Run</span><span>Esc Close</span></div>
    </section>
  </div>;
}
