import { ArrowRight, CalendarDays, CheckCircle2, CircleHelp, Coins, Command, Crosshair, Focus, Inbox, Keyboard, ListChecks, Repeat2, Sparkles, Target } from 'lucide-react'
import { SurfaceCard } from '../components/SurfaceCard'
import { navigate } from '../lib/router'
import { emitUI } from '../lib/ui-events'

const coreFlow = [
  { icon: Inbox, title: '1. Capture', body: 'Anote rápido o que surgiu. Não pare para organizar tudo na hora.', action: 'Abrir Inbox', path: '/inbox' },
  { icon: Crosshair, title: '2. Escolha o dia', body: 'Em Hoje, registre sua energia e veja as prioridades que fazem sentido agora.', action: 'Abrir Hoje', path: '/hoje' },
  { icon: Focus, title: '3. Faça um bloco', body: 'Escolha uma missão, defina o tempo e use Foco para executar sem ficar trocando de tela.', action: 'Abrir Foco', path: '/foco' },
  { icon: CheckCircle2, title: '4. Revise', body: 'No fim da semana, veja o que avançou, o que travou e ajuste a próxima.', action: 'Abrir Revisão', path: '/revisao' },
]

const destinations = [
  ['Missões', 'Tarefas que têm começo e fim. Use para coisas executáveis.', '/missoes'],
  ['Projetos', 'Resultados que precisam de várias missões para serem concluídos.', '/projetos'],
  ['Calendário', 'Prazos e compromissos com data. Use quando o tempo importa.', '/calendario'],
  ['Rotinas', 'Passos recorrentes que você quer repetir sem decidir tudo de novo.', '/rotinas'],
  ['Estudos', 'Grade, plantões, simulados e sua rotina acadêmica.', '/estudos'],
  ['Finanças', 'Resumo financeiro e, depois, registros e decisões de dinheiro.', '/financas'],
  ['Life RPG', 'Progressão por XP, atributos, temporada, conquistas e recompensas.', '/life-rpg'],
  ['Insights', 'Gráficos e padrões gerados a partir do que você realmente registrou.', '/insights'],
]

export function TutorialPage() {
  return <div className="page-stack tutorial-page">
    <section className="page-hero page-hero--green tutorial-hero">
      <div>
        <span className="eyebrow">Comece aqui</span>
        <h1>Como usar o Nexus</h1>
        <p>Você não precisa usar todas as abas. No dia a dia, o fluxo básico é simples: capturar, escolher o que importa, executar e revisar.</p>
      </div>
      <button className="primary-button" onClick={() => navigate('/hoje')}><Crosshair size={16}/> Ir para Hoje</button>
    </section>

    <SurfaceCard tone="green" eyebrow="O essencial" title="Se estiver perdido, siga só estes quatro passos">
      <div className="tutorial-flow">
        {coreFlow.map(({ icon: Icon, title, body, action, path }) => <article className="tutorial-step" key={title}>
          <span className="tutorial-step__icon"><Icon size={18}/></span>
          <div><strong>{title}</strong><p>{body}</p><button className="text-button" onClick={() => navigate(path)}>{action}<ArrowRight size={13}/></button></div>
        </article>)}
      </div>
    </SurfaceCard>

    <section className="tutorial-grid">
      <SurfaceCard tone="blue" eyebrow="Regra prática" title="Onde cada coisa entra">
        <div className="tutorial-rules">
          <div><ListChecks size={16}/><span><strong>É uma ação?</strong> Missão.</span></div>
          <div><Target size={16}/><span><strong>Precisa de várias ações?</strong> Projeto.</span></div>
          <div><CalendarDays size={16}/><span><strong>Tem dia ou horário?</strong> Calendário.</span></div>
          <div><Repeat2 size={16}/><span><strong>Se repete?</strong> Rotina.</span></div>
          <div><Inbox size={16}/><span><strong>Ainda não sabe?</strong> Inbox.</span></div>
        </div>
      </SurfaceCard>

      <SurfaceCard tone="violet" eyebrow="Atalhos" title="As duas coisas que aceleram o uso">
        <div className="tutorial-shortcuts">
          <button onClick={() => emitUI('command')}><span><Command size={15}/> K</span><div><strong>Buscar e abrir</strong><small>Encontre qualquer área sem navegar pela barra lateral.</small></div></button>
          <button onClick={() => emitUI('quickAdd')}><span><Keyboard size={15}/> N</span><div><strong>Captura rápida</strong><small>Crie uma entrada ou missão sem sair da tela atual.</small></div></button>
        </div>
      </SurfaceCard>
    </section>

    <SurfaceCard eyebrow="Referência" title="O que as outras abas fazem">
      <div className="tutorial-destinations">
        {destinations.map(([title, body, path]) => <button key={path} onClick={() => navigate(path)}><div><strong>{title}</strong><span>{body}</span></div><ArrowRight size={14}/></button>)}
      </div>
    </SurfaceCard>

    <section className="tutorial-grid">
      <SurfaceCard tone="violet" eyebrow="Life RPG" title="Você não precisa administrar a gamificação">
        <div className="tutorial-rpg">
          <div><Sparkles size={16}/><p><strong>XP</strong> vem das missões e rotinas concluídas.</p></div>
          <div><Coins size={16}/><p><strong>Coins</strong> servem para resgatar recompensas.</p></div>
          <div><Target size={16}/><p><strong>Atributos e temporada</strong> mostram em que áreas você está acumulando progresso.</p></div>
        </div>
        <button className="text-button" onClick={() => navigate('/life-rpg')}>Ver meu progresso<ArrowRight size={13}/></button>
      </SurfaceCard>

      <SurfaceCard tone="slate" eyebrow="Pode ignorar no começo" title="Nem tudo precisa entrar na rotina diária">
        <div className="tutorial-ignore">
          <CircleHelp size={18}/>
          <p>Insights, Histórico, Planejamento e algumas áreas mais profundas existem para consultas específicas. Se você não tiver motivo para abrir uma delas, simplesmente não abra.</p>
        </div>
      </SurfaceCard>
    </section>
  </div>
}
