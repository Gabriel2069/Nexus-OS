import { Activity, Archive, BookOpen, Brain, CalendarDays, CircleDollarSign, Compass, Mountain } from 'lucide-react'
import { AppShell } from './components/AppShell'
import { NexusProvider } from './context/NexusContext'
import { CalendarPage } from './pages/CalendarPage'
import { FocusPage } from './pages/FocusPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { InboxPage } from './pages/InboxPage'
import { LifeRpgPage } from './pages/LifeRpgPage'
import { MissionsPage } from './pages/MissionsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { SectionPage } from './pages/SectionPage'
import { StudiesPage } from './pages/StudiesPage'
import { TodayPage } from './pages/TodayPage'
import { WeeklyReviewPage } from './pages/WeeklyReviewPage'
import { usePathname } from './lib/router'

function RouteContent({pathname}:{pathname:string}){
  switch(pathname){
    case '/': return <HomePage/>
    case '/hoje': return <TodayPage/>
    case '/life-rpg': return <LifeRpgPage/>
    case '/missoes': return <MissionsPage/>
    case '/calendario': return <CalendarPage/>
    case '/rotinas': return <RoutinesPage/>
    case '/foco': return <FocusPage/>
    case '/insights': return <InsightsPage/>
    case '/revisao': return <WeeklyReviewPage/>
    case '/inbox': return <InboxPage/>
    case '/metas': return <SectionPage eyebrow="Direção" title="Metas" description="Poucos resultados prioritários, conectados a evidências reais e projetos executáveis." tone="indigo" icon={Mountain} highlights={[{label:'Horizonte',value:'Anual',detail:'identidade e direção'},{label:'Ciclo',value:'90d',detail:'resultado concreto'},{label:'Revisão',value:'7d',detail:'ajuste de rota'},{label:'Limite',value:'03',detail:'prioridades reais'}]} panels={[{title:'Horizonte anual',body:'Identidade, direção e mudanças amplas que organizam o restante do ano.'},{title:'Metas trimestrais',body:'Resultados concretos que cabem em um ciclo e podem ser medidos.'},{title:'Estratégia semanal',body:'Ações e decisões que movem as metas sem criar uma lista infinita.'}]}/>
    case '/estudos': return <StudiesPage/>
    case '/saude': return <SectionPage eyebrow="Wellbeing" title="Saúde" description="Treino, nutrição, hábitos, energia e recuperação apoiando uma rotina sustentável." tone="green" icon={Activity} highlights={[{label:'Check-in',value:'Diário',detail:'energia e estresse'},{label:'Rotina',value:'Contextual',detail:'manhã e noite'},{label:'Foco',value:'Protegido',detail:'sem compensação'},{label:'Tendência',value:'Insights',detail:'padrões ao longo do tempo'}]} panels={[{title:'Treinos',body:'Plano, execução real e evolução técnica.'},{title:'Nutrição',body:'Planejamento alimentar e hidratação como apoio à rotina.'},{title:'Hábitos',body:'Ritmos recorrentes com foco em retomada, não perfeição.'}]}/>
    case '/projetos': return <ProjectsPage/>
    case '/financas': return <SectionPage eyebrow="Finance Control" title="Finanças" description="Entradas, gastos, reservas, decisões e projeções sem misturar registro com ruído." tone="amber" icon={CircleDollarSign} highlights={[{label:'Visão',value:'Mensal',detail:'fluxo e decisões'},{label:'Reserva',value:'Protegida',detail:'fora do operacional'},{label:'Compras',value:'Contexto',detail:'custo e alternativa'},{label:'Histórico',value:'Separado',detail:'sem poluir o agora'}]} panels={[{title:'Fluxo do mês',body:'Entradas e saídas consolidadas antes dos detalhes.'},{title:'Planejamento',body:'Decisões maiores passam por custo, impacto e prioridade.'},{title:'Histórico',body:'Registros antigos disponíveis sem poluir o painel.'}]}/>
    case '/conhecimento': case '/biblioteca': return <SectionPage eyebrow="Knowledge Vault" title="Segundo Cérebro" description="Conhecimento útil, conectado a projetos e pronto para ser reencontrado e usado." tone="cyan" icon={Brain} highlights={[{label:'Fluxo',value:'Capturar',detail:'depois destilar'},{label:'Notas',value:'Conectadas',detail:'áreas e projetos'},{label:'Uso',value:'Ativo',detail:'conhecimento vira criação'},{label:'Revisão',value:'Curada',detail:'menos acúmulo'}]} panels={[{title:'Biblioteca',body:'Livros, artigos, aulas e referências com contexto e origem.'},{title:'Notas conectadas',body:'Ideias destiladas e relacionadas a outras notas e projetos.'},{title:'Inbox de conhecimento',body:'Conteúdo recém-capturado que ainda precisa ser processado.'}]}/>
    case '/planejamento': return <SectionPage eyebrow="Planning Lab" title="Planejamento" description="Visão, arquitetura, execução e revisão em um fluxo que reduz incerteza sem tentar prever tudo." tone="indigo" icon={CalendarDays} highlights={[{label:'Entrada',value:'Visão',detail:'resultado desejado'},{label:'Saída',value:'Ação',detail:'próximo passo real'},{label:'Horizonte',value:'Tempo',detail:'marcos visíveis'},{label:'Revisão',value:'Adaptativa',detail:'plano segue realidade'}]} panels={[{title:'Arquitetura',body:'Fases, recursos, riscos e dependências.'},{title:'Execução',body:'O plano entra em movimento quando existe próxima ação.'},{title:'Revisão',body:'Ajuste o mapa quando a realidade mudar.'}]}/>
    case '/historico': return <SectionPage eyebrow="Annual Archive" title="Histórico" description="Uma linha do tempo para preservar marcos, decisões, aprendizados e mudanças de direção." tone="slate" icon={Archive} highlights={[{label:'2024',value:'Fundação',detail:'primeiros sistemas'},{label:'2025',value:'Expansão',detail:'novas competências'},{label:'2026',value:'Convergência',detail:'Nexus e TdV'},{label:'Ritual',value:'Mensal',detail:'preservar marcos'}]} panels={[{title:'Marcos',body:'Vitórias, decisões e experiências que merecem permanecer.'},{title:'Aprendizados',body:'O que mudou sua forma de pensar ou agir.'},{title:'Próximo ciclo',body:'O que deve continuar, parar ou ganhar espaço.'}]}/>
    case '/guia': return <SectionPage eyebrow="Nexus Manual" title="Guia" description="Capture, processe, execute e revise. O sistema existe para reduzir esforço mental, não para criar trabalho." tone="green" icon={Compass} highlights={[{label:'1',value:'Capturar',detail:'tirar da cabeça'},{label:'2',value:'Processar',detail:'dar significado'},{label:'3',value:'Executar',detail:'ver pouco e agir'},{label:'4',value:'Revisar',detail:'atualizar o mapa'}]} panels={[{title:'Diariamente',body:'Escolha poucos alvos, use foco e capture o que surgir.'},{title:'Semanalmente',body:'Esvazie inbox, atualize projetos e reorganize compromissos.'},{title:'Mensalmente',body:'Revise tendências, metas, áreas e a própria arquitetura do sistema.'}]}/>
    default: return <SectionPage eyebrow="404" title="Fora da trama" description="Esta rota ainda não faz parte do Nexus." tone="slate" icon={BookOpen} highlights={[]} panels={[]}/>
  }
}

export function App(){const pathname=usePathname(); return <NexusProvider><AppShell pathname={pathname}><RouteContent pathname={pathname}/></AppShell></NexusProvider>}
