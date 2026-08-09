import { ArrowRight, CalendarDays, CheckCircle2, CircleHelp, Coins, Command, Crosshair, Focus, Inbox, Keyboard, ListChecks, Repeat2, Sparkles, Target } from 'lucide-react'
import { SurfaceCard } from '../components/SurfaceCard'
import { navigate } from '../lib/router'
import { emitUI } from '../lib/ui-events'

const coreFlow = [
  { icon: Crosshair, title: '1. Abra Agora', body: 'Veja o compromisso atual, o próximo horário e o que cabe no intervalo. Na maior parte do dia, comece por aqui.', action: 'Abrir Agora', path: '/' },
  { icon: Focus, title: '2. Faça só o bloco indicado', body: 'Quando houver uma janela boa para estudo, o Nexus já leva a missão e o tempo sugerido para Foco.', action: 'Abrir Foco', path: '/foco' },
  { icon: Inbox, title: '3. Capture o que surgir', body: 'Se aparecer algo novo, jogue na Inbox e volte ao que estava fazendo. Organize depois.', action: 'Abrir Inbox', path: '/inbox' },
  { icon: CheckCircle2, title: '4. Feche e revise', body: 'Feche o dia em dois minutos. A revisão semanal serve para ajustar o sistema, não para reconstruir sua semana.', action: 'Abrir Revisão', path: '/revisao' },
]

const destinations = [
  ['Hoje', 'Mostra o dia com mais detalhe, seu check-in e o único estudo que merece atenção.', '/hoje'],
  ['Missões', 'Tarefas executáveis. Você não precisa abrir essa lista toda vez que quiser saber o que fazer.', '/missoes'],
  ['Projetos', 'Resultados que precisam de várias missões para terminar.', '/projetos'],
  ['Calendário', 'Escola, aulas, academia, plantões, provas e prazos no mesmo lugar.', '/calendario'],
  ['Rotinas', 'Só os pequenos passos recorrentes que realmente vale marcar.', '/rotinas'],
  ['Estudos', 'Grade, plantões, simulados e calendário acadêmico.', '/estudos'],
  ['Finanças', 'Mesada, reserva, plano de gastos e registros simples de entradas e saídas.', '/financas'],
  ['Life RPG', 'Sua progressão. Ele acompanha a rotina; não é outra rotina para administrar.', '/life-rpg'],
]

export function TutorialPage() {
  return <div className="page-stack tutorial-page">
    <section className="page-hero page-hero--green tutorial-hero">
      <div><span className="eyebrow">Comece aqui</span><h1>Como usar o Nexus</h1><p>Você não precisa navegar pelo sistema para descobrir o que fazer. Abra Agora, siga o contexto do momento e entre nas outras abas só quando precisar de mais detalhe.</p></div>
      <button className="primary-button" onClick={() => navigate('/')}><Crosshair size={16}/> Abrir Agora</button>
    </section>

    <SurfaceCard tone="green" eyebrow="O essencial" title="O fluxo diário cabe nestes quatro passos">
      <div className="tutorial-flow">{coreFlow.map(({ icon: Icon, title, body, action, path }) => <article className="tutorial-step" key={title}><span className="tutorial-step__icon"><Icon size={18}/></span><div><strong>{title}</strong><p>{body}</p><button className="text-button" onClick={() => navigate(path)}>{action}<ArrowRight size={13}/></button></div></article>)}</div>
    </SurfaceCard>

    <section className="tutorial-grid">
      <SurfaceCard tone="blue" eyebrow="Regra prática" title="Onde cada coisa entra"><div className="tutorial-rules"><div><ListChecks size={16}/><span><strong>É uma ação?</strong> Missão.</span></div><div><Target size={16}/><span><strong>Precisa de várias ações?</strong> Projeto.</span></div><div><CalendarDays size={16}/><span><strong>Tem dia ou horário?</strong> Calendário.</span></div><div><Repeat2 size={16}/><span><strong>Se repete e vale marcar?</strong> Rotina.</span></div><div><Inbox size={16}/><span><strong>Ainda não sabe?</strong> Inbox.</span></div></div></SurfaceCard>
      <SurfaceCard tone="violet" eyebrow="Atalhos" title="Duas formas rápidas de sair de qualquer tela"><div className="tutorial-shortcuts"><button onClick={() => emitUI('command')}><span><Command size={15}/> K</span><div><strong>Buscar e abrir</strong><small>Encontre qualquer área sem caçar no menu.</small></div></button><button onClick={() => emitUI('quickAdd')}><span><Keyboard size={15}/> N</span><div><strong>Captura rápida</strong><small>Anote algo sem abandonar o que estava fazendo.</small></div></button></div></SurfaceCard>
    </section>

    <SurfaceCard eyebrow="Referência" title="Quando vale abrir as outras abas"><div className="tutorial-destinations">{destinations.map(([title, body, path]) => <button key={path} onClick={() => navigate(path)}><div><strong>{title}</strong><span>{body}</span></div><ArrowRight size={14}/></button>)}</div></SurfaceCard>

    <section className="tutorial-grid">
      <SurfaceCard tone="violet" eyebrow="Life RPG" title="A gamificação acompanha sua vida"><div className="tutorial-rpg"><div><Sparkles size={16}/><p><strong>XP</strong> vem do que você já conclui no Nexus, especialmente missões e o pequeno ciclo diário.</p></div><div><Coins size={16}/><p><strong>Coins</strong> servem para recompensas, sem transformar descanso ou vida social em obrigação.</p></div><div><Target size={16}/><p><strong>Atributos e temporada</strong> mostram progresso acumulado; você não precisa gerenciá-los no dia a dia.</p></div></div><button className="text-button" onClick={() => navigate('/life-rpg')}>Ver meu progresso<ArrowRight size={13}/></button></SurfaceCard>
      <SurfaceCard tone="slate" eyebrow="Importante" title="O Nexus não deve preencher todo o seu tempo"><div className="tutorial-ignore"><CircleHelp size={18}/><p>Quando Agora disser para descansar, ficar com a família, cuidar de você ou deixar a janela livre, isso já é o sistema funcionando. Você não precisa criar uma missão para justificar esse tempo.</p></div></SurfaceCard>
    </section>
  </div>
}
