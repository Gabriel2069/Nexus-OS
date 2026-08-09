import { CircleDollarSign, Landmark, PiggyBank, ShieldCheck, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { useNexus } from '../context/NexusContext'
import { supabase } from '../lib/supabase'

type FinanceSnapshot = {
  id: string
  snapshot_date: string
  monthly_allowance: number | string
  saved_money: number | string
  spending_plan: number | string
  note: string | null
  source: string
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const number = (value: number | string | undefined) => Number(value ?? 0)

export function FinancePage() {
  const { userId } = useNexus()
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let alive = true
    setLoading(true)
    supabase.from('financial_snapshots').select('*').eq('user_id', userId).order('snapshot_date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) console.error('Could not load finance snapshot', error)
        setSnapshot((data as FinanceSnapshot | null) ?? null)
        setLoading(false)
      })
    return () => { alive = false }
  }, [userId])

  const allowance = number(snapshot?.monthly_allowance)
  const saved = number(snapshot?.saved_money)
  const spending = number(snapshot?.spending_plan)
  const planPct = allowance > 0 ? Math.round(spending / allowance * 100) : 0
  const protectedAmount = Math.max(0, allowance - spending)
  const updated = useMemo(() => snapshot?.snapshot_date ? new Date(`${snapshot.snapshot_date}T12:00:00-03:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null, [snapshot])

  return <div className="page-stack finance-page">
    <section className="page-hero page-hero--amber finance-hero">
      <div><span className="eyebrow">Resumo atual</span><h1>Finanças</h1><p>Veja os valores principais cadastrados e mantenha decisões de dinheiro separadas da gamificação do Nexus.</p></div>
      <div className="finance-hero__status"><ShieldCheck size={17}/><div><span>Atualizado em</span><strong>{updated ?? (loading ? 'Carregando…' : 'Sem registro')}</strong><small>dados privados</small></div></div>
    </section>

    <section className="finance-metrics">
      <SurfaceCard tone="blue" className="finance-metric"><span className="finance-metric__icon"><WalletCards size={18}/></span><div><span>Mesada</span><strong>{brl.format(allowance)}</strong><small>valor mensal cadastrado</small></div></SurfaceCard>
      <SurfaceCard tone="green" className="finance-metric finance-metric--primary"><span className="finance-metric__icon"><PiggyBank size={18}/></span><div><span>Dinheiro guardado</span><strong>{brl.format(saved)}</strong><small>reserva registrada</small></div></SurfaceCard>
      <SurfaceCard tone="amber" className="finance-metric"><span className="finance-metric__icon"><CircleDollarSign size={18}/></span><div><span>Plano de gastos</span><strong>{brl.format(spending)}</strong><small>{planPct}% da mesada</small></div></SurfaceCard>
    </section>

    <section className="finance-layout">
      <SurfaceCard tone="amber" eyebrow="Mesada" title="Plano mensal">
        <div className="finance-plan">
          <div className="finance-plan__header"><div><span>Planejado para gastos</span><strong>{brl.format(spending)}</strong></div><div><span>Não destinado ao plano</span><strong>{brl.format(protectedAmount)}</strong></div></div>
          <div className="finance-plan__bar"><span style={{ width: `${Math.min(100, planPct)}%` }} /></div>
          <p>Esse restante não é tratado automaticamente como dinheiro livre para gastar; ele aparece apenas para mostrar a divisão do valor cadastrado.</p>
        </div>
      </SurfaceCard>

      <SurfaceCard tone="green" eyebrow="Reserva" title="Dinheiro guardado">
        <div className="finance-reserve"><Landmark size={25}/><strong>{brl.format(saved)}</strong><span>registrados como reserva</span></div>
      </SurfaceCard>
    </section>

    <SurfaceCard tone="slate" eyebrow="Histórico" title="Registros detalhados"><div className="finance-import-state"><ShieldCheck size={17}/><p>O resumo atual já está no Nexus. Os lançamentos antigos continuam separados até a importação completa do histórico financeiro.</p></div></SurfaceCard>
  </div>
}
