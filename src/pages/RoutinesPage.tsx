import { Check, ChevronRight, Circle, Clock3, Repeat2, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'

export function RoutinesPage() {
  const { workspace, setRoutineItem } = useNexus()
  const completed = new Set(workspace.routineCompletions.map((item) => item.routine_item_id))
  const allItems = workspace.routines.flatMap((routine) => routine.routine_items ?? [])
  const total = allItems.length
  const done = allItems.filter((item) => completed.has(item.id)).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const hour = new Date().getHours()
  const relevantPeriod = hour < 12 ? 'morning' : hour >= 20 ? 'evening' : 'anytime'
  const relevant = workspace.routines.find((routine) => routine.period === relevantPeriod) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(relevant?.id ?? workspace.routines[0]?.id ?? null)
  const selected = workspace.routines.find((routine) => routine.id === selectedId) ?? null
  const selectedItems = useMemo(
    () => (selected ? [...(selected.routine_items ?? [])].sort((a, b) => a.sort_order - b.sort_order) : []),
    [selected],
  )
  const selectedDone = selectedItems.filter((item) => completed.has(item.id)).length

  async function completeRemaining() {
    for (const item of selectedItems) {
      if (!completed.has(item.id)) await setRoutineItem(item.id, true)
    }
  }

  function inspect(id: string) {
    setSelectedId(id)
    if (window.matchMedia('(max-width:760px)').matches) {
      window.setTimeout(() => document.querySelector('.routine-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  return (
    <div className="page-stack routines-page routines-page--consultable">
      <section className="page-hero page-hero--green">
        <div>
          <span className="eyebrow">Passos recorrentes</span>
          <h1>Rotinas</h1>
          <p>O Nexus mantém poucas rotinas. Consulte a que faz sentido agora, marque o necessário e saia — sem transformar recorrência em uma segunda lista de tarefas.</p>
        </div>
        <div className="page-hero__badge"><Repeat2 size={17} /><span>{pct}% hoje</span></div>
      </section>

      <SurfaceCard tone={relevant ? 'green' : 'slate'} className="routine-now-signal">
        <div>
          <span className="eyebrow">Agora</span>
          <h2>{relevant ? `${relevant.icon ?? '◌'} ${relevant.name}` : 'Nenhuma rotina precisa de atenção agora'}</h2>
          <p>{relevant?.description ?? 'O espaço entre abertura e fechamento do dia pertence à rotina real: escola, estudo, família, descanso e compromissos.'}</p>
        </div>
        {relevant && <button className="secondary-button" onClick={() => inspect(relevant.id)}>Consultar <ChevronRight size={14} /></button>}
      </SurfaceCard>

      <section className="routine-summary">
        <SurfaceCard tone="green">
          <div className="routine-progress">
            <div><span className="eyebrow">Hoje</span><strong>{done}<em>/ {total}</em></strong><p>microetapas concluídas</p></div>
            <div className="big-progress"><span style={{ width: `${pct}%` }} /></div>
          </div>
        </SurfaceCard>
      </section>

      <section className={`routine-workspace ${selected ? 'has-inspector' : ''}`}>
        <div className="routine-grid routine-grid--interactive">
          {workspace.routines.map((routine) => {
            const items = [...(routine.routine_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const routineDone = items.filter((item) => completed.has(item.id)).length
            return (
              <button className={`routine-select-card ${selectedId === routine.id ? 'selected' : ''}`} key={routine.id} onClick={() => inspect(routine.id)}>
                <div>
                  <span className="routine-select-card__icon">{routine.icon ?? '◌'}</span>
                  <div>
                    <span className="eyebrow">{routine.period === 'morning' ? 'Manhã' : routine.period === 'evening' ? 'Noite' : 'Rotina'}</span>
                    <strong>{routine.name}</strong>
                    <small>{routine.description}</small>
                  </div>
                </div>
                <footer><span>{routineDone}/{items.length} hoje</span><ChevronRight size={15} /></footer>
              </button>
            )
          })}
        </div>

        {selected && (
          <aside className="routine-inspector">
            <SurfaceCard tone={selected.period === 'morning' ? 'amber' : selected.period === 'evening' ? 'violet' : 'green'} className="entity-inspector">
              <div className="entity-inspector__header">
                <div><span className="eyebrow">Rotina selecionada</span><h2>{selected.icon ?? '◌'} {selected.name}</h2></div>
                <button className="icon-button" onClick={() => setSelectedId(null)}><X size={16} /></button>
              </div>
              <p className="panel-copy">{selected.description}</p>
              <div className="entity-inspector__meta">
                <span>{selectedDone}/{selectedItems.length} concluídas</span>
                <span>{selectedItems.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0)} min</span>
                <span>+{selectedItems.reduce((sum, item) => sum + item.xp_reward, 0)} XP</span>
              </div>
              {selectedDone < selectedItems.length && <button className="primary-button" onClick={() => void completeRemaining()}><Check size={15} />Concluir o que falta</button>}
            </SurfaceCard>

            <SurfaceCard eyebrow="Etapas" title="O que realmente precisa ser marcado">
              <div className="routine-items routine-items--inspector">
                {selectedItems.map((item) => {
                  const isDone = completed.has(item.id)
                  return (
                    <button className={`routine-item ${isDone ? 'done' : ''}`} key={item.id} onClick={() => void setRoutineItem(item.id, !isDone)}>
                      <span className="routine-check">{isDone ? <Check size={14} /> : <Circle size={14} />}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.duration_minutes ? <><Clock3 size={11} />{item.duration_minutes} min</> : null}<span>+{item.xp_reward} XP</span></small>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard tone="slate" eyebrow="Regra" title="Quando esta rotina termina">
              <div className="routine-boundary"><Sparkles size={17} /><p>{selected.period === 'morning' ? 'Depois do check-in, volte para Agora. Você não precisa abrir outras abas para “completar a manhã”.' : selected.period === 'evening' ? 'Depois do fechamento, não comece outro bloco. O sistema encerra junto com você.' : 'Marque apenas o que realmente precisa de recorrência.'}</p></div>
            </SurfaceCard>
          </aside>
        )}
      </section>

      {!workspace.routines.length && <SurfaceCard><div className="empty-state"><Sparkles size={24} /><h3>Nenhuma rotina ativa.</h3><p>Isso também pode ser um estado válido.</p></div></SurfaceCard>}
    </div>
  )
}
