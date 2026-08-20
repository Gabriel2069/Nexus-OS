import { Command, Crosshair, Focus, Inbox, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'
import { UI_EVENTS, emitUI } from '../lib/ui-events'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const items = useMemo(() => navigation.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), [])
  const filtered = items.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
  function go(path: string) { setOpen(false); setQuery(''); navigate(path) }
  useEffect(() => { const show = () => setOpen(true); const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value); return } if (!open) return; if (event.key === 'Escape') { setOpen(false); return } if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0))); return } if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); return } if (event.key === 'Enter' && filtered[selected]) { event.preventDefault(); go(filtered[selected].path); return } if (!query) { const shortcut = event.key.toLowerCase(); if (shortcut === 'n') { event.preventDefault(); setOpen(false); emitUI('quickAdd') } if (shortcut === 'h') { event.preventDefault(); go('/hoje') } if (shortcut === 'f') { event.preventDefault(); go('/foco') } if (shortcut === 'i') { event.preventDefault(); go('/inbox') } } }; window.addEventListener(UI_EVENTS.command, show); window.addEventListener('keydown', onKey); return () => { window.removeEventListener(UI_EVENTS.command, show); window.removeEventListener('keydown', onKey) } }, [open, query, selected, filtered])
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 20) }, [open])
  useEffect(() => { setSelected(0) }, [query, open])
  if (!open) return null
  return <div className="overlay nexus-command-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Central de comandos" data-motion-surface="command">
      <div className="command-palette__search" data-motion="command-search"><Search size={17} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ir para uma área ou executar uma ação…" aria-label="Pesquisar no Nexus" /><button onClick={() => setOpen(false)} aria-label="Fechar"><X size={16} /></button></div>
      {!query && <div className="command-quick" data-motion="quick-actions"><button onClick={() => { setOpen(false); emitUI('quickAdd') }}><Plus size={16} /><span>Nova missão</span><kbd>N</kbd></button><button onClick={() => go('/hoje')}><Crosshair size={16} /><span>Abrir Hoje</span><kbd>H</kbd></button><button onClick={() => go('/foco')}><Focus size={16} /><span>Iniciar foco</span><kbd>F</kbd></button><button onClick={() => go('/inbox')}><Inbox size={16} /><span>Caixa de entrada</span><kbd>I</kbd></button></div>}
      <div className="command-results" role="listbox" aria-label={query ? 'Resultados' : 'Navegação'} data-motion="results"><span className="command-section-label">{query ? 'Resultados' : 'Navegação'}</span>{filtered.map((item, index) => { const Icon = item.icon; return <button key={item.path} role="option" aria-selected={selected === index} className={selected === index ? 'is-selected' : ''} onMouseEnter={() => setSelected(index)} onClick={() => go(item.path)} data-motion="result"><span className={`nav-item__icon tone-${item.tone}`}><Icon size={16} /></span><div><strong>{item.label}</strong><small>{item.group}</small></div><Command size={12} /></button> })}{!filtered.length && <div className="command-empty">Nenhum destino encontrado.</div>}</div>
      <footer className="command-palette__footer"><span>↑↓ navegar</span><span>↵ abrir</span><span>esc fechar</span></footer>
    </section>
  </div>
}
