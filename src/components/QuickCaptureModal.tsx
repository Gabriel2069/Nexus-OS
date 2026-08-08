import { Inbox, ListChecks, LoaderCircle, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNexus } from '../context/NexusContext'
import { UI_EVENTS } from '../lib/ui-events'

type CaptureType = 'mission' | 'inbox'

export function QuickCaptureModal() {
  const { addMission } = useNexus()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<CaptureType>('mission')
  const [rank, setRank] = useState<'D' | 'C' | 'B' | 'A' | 'S'>('C')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const show = () => setOpen(true); window.addEventListener(UI_EVENTS.quickAdd, show); return () => window.removeEventListener(UI_EVENTS.quickAdd, show) }, [])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40) }, [open])
  if (!open) return null
  async function submit(event: FormEvent) { event.preventDefault(); if (!title.trim()) return; setSaving(true); const xp = { D: 30, C: 60, B: 120, A: 220, S: 400 }[rank]; await addMission(title, { status: type === 'inbox' ? 'Inbox' : 'A fazer', rank, xp_base: xp, coins_base: Math.round(xp / 6) }); setSaving(false); setTitle(''); setOpen(false) }
  return <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="quick-modal" role="dialog" aria-modal="true"><div className="modal-title"><div><span className="eyebrow">Quick capture</span><h2>Coloque no sistema.</h2></div><button className="icon-button" onClick={() => setOpen(false)}><X size={17} /></button></div><div className="segmented-control"><button className={type === 'mission' ? 'active' : ''} onClick={() => setType('mission')}><ListChecks size={15} /> Missão</button><button className={type === 'inbox' ? 'active' : ''} onClick={() => setType('inbox')}><Inbox size={15} /> Inbox</button></div><form onSubmit={submit} className="quick-form"><label>O que precisa entrar?</label><input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'mission' ? 'Ex.: revisar neurologia por 45 min' : 'Ideia, link, lembrete…'} />{type === 'mission' && <div className="rank-picker"><span>Rank</span>{(['D','C','B','A','S'] as const).map((item) => <button type="button" key={item} className={rank === item ? 'active' : ''} onClick={() => setRank(item)}>{item}</button>)}</div>}<button className="primary-button modal-submit" disabled={saving || !title.trim()}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{saving ? 'Salvando…' : type === 'mission' ? 'Criar missão' : 'Capturar'}</button></form></section></div>
}
