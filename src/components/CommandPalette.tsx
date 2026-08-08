import { Command, Crosshair, Focus, Inbox, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { navigation } from '../data/navigation'
import { navigate } from '../lib/router'
import { UI_EVENTS, emitUI } from '../lib/ui-events'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const items = useMemo(() => navigation.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), [])
  const filtered = items.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10)

  useEffect(() => {
    const show = () => setOpen(true)
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen((value) => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener(UI_EVENTS.command, show)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener(UI_EVENTS.command, show); window.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40) }, [open])
  if (!open) return null
  const go = (path: string) => { setOpen(false); setQuery(''); navigate(path) }

  return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Central de comandos"><div className="command-palette__search"><Search size={17} /><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ir para uma área ou executar uma ação…" /><button onClick={() => setOpen(false)}><X size={16} /></button></div>{!query && <div className="command-quick"><button onClick={() => { setOpen(false); emitUI('quickAdd') }}><Plus size={16} /><span>Nova missão</span><kbd>N</kbd></button><button onClick={() => go('/hoje')}><Crosshair size={16} /><span>Abrir Hoje</span><kbd>H</kbd></button><button onClick={() => go('/foco')}><Focus size={16} /><span>Iniciar foco</span><kbd>F</kbd></button><button onClick={() => go('/inbox')}><Inbox size={16} /><span>Caixa de entrada</span><kbd>I</kbd></button></div>}<div className="command-results"><span className="command-section-label">{query ? 'Resultados' : 'Navegação'}</span>{filtered.map((item) => { const Icon = item.icon; return <button key={item.path} onClick={() => go(item.path)}><span className={`nav-item__icon tone-${item.tone}`}><Icon size={16} /></span><div><strong>{item.label}</strong><small>{item.group}</small></div><Command size={12} /></button> })}{!filtered.length && <div className="command-empty">Nenhum destino encontrado.</div>}</div></section></div>
}
