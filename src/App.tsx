import { Activity, Archive, BookOpen, Brain, CalendarDays, Mountain } from 'lucide-react'
import { AppShell } from './components/AppShell'
import { NexusProvider } from './context/NexusContext'
import { CalendarPage } from './pages/CalendarPage'
import { FinancePage } from './pages/FinancePage'
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
import { TutorialPage } from './pages/TutorialPage'
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
    case '/metas': return <SectionPage eyebrow="Direção" title="Metas" description="Defina poucos resultados importantes e acompanhe o que realmente mostra progresso." tone="indigo" icon={Mountain} highlights={[{label:'Horizonte',value:'Ano',detail:'direção geral'},{label:'Ciclo',value:'90 dias',detail:'resultado concreto'},{label:'Revisão',value:'Semanal',detail:'ajuste de rota'},{label:'Limite',value:'Até 3',detail:'prioridades principais'}]} panels={[{title:'Metas anuais',body:'Use para registrar as mudanças e resultados que realmente importam no ano.'},{title:'Metas trimestrais',body:'Quebre a direção anual em resultados que cabem nos próximos meses.'},{title:'Próxima ação',body:'Uma meta só entra na rotina quando está ligada a um projeto ou a uma ação concreta.'}]}/>
    case '/estudos': return <StudiesPage/>
    case '/saude': return <SectionPage eyebrow="Saúde" title="Bem-estar" description="Treino, alimentação, energia e hábitos em uma visão simples para apoiar sua rotina." tone="green" icon={Activity} highlights={[{label:'Check-in',value:'Diário',detail:'energia e humor'},{label:'Rotina',value:'Recorrente',detail:'hábitos úteis'},{label:'Foco',value:'Equilibrado',detail:'sem compensação'},{label:'Tendências',value:'Insights',detail:'padrões ao longo do tempo'}]} panels={[{title:'Treinos',body:'Registre o plano e a execução sem transformar cada treino em burocracia.'},{title:'Alimentação',body:'Use para planejamento e referências que ajudem suas decisões do dia a dia.'},{title:'Hábitos',body:'Acompanhe o que vale repetir; dias perdidos não precisam virar punição.'}]}/>
    case '/projetos': return <ProjectsPage/>
    case '/financas': return <FinancePage/>
    case '/conhecimento': case '/biblioteca': return <SectionPage eyebrow="Conhecimento" title="Segundo Cérebro" description="Guarde referências e notas que você realmente pretende encontrar e usar depois." tone="cyan" icon={Brain} highlights={[{label:'Entrada',value:'Capturar',detail:'guardar primeiro'},{label:'Notas',value:'Conectadas',detail:'projetos e áreas'},{label:'Uso',value:'Prático',detail:'consultar quando precisar'},{label:'Revisão',value:'Seletiva',detail:'evitar acúmulo'}]} panels={[{title:'Biblioteca',body:'Livros, artigos, aulas e outras referências que valem ser preservadas.'},{title:'Notas',body:'Ideias e aprendizados resumidos com contexto suficiente para fazer sentido depois.'},{title:'Pendências',body:'Conteúdo recém-capturado que ainda precisa ser lido, resumido ou descartado.'}]}/>
    case '/planejamento': return <SectionPage eyebrow="Planejamento" title="Planos" description="Organize etapas, prazos e decisões quando um projeto precisa de mais estrutura." tone="indigo" icon={CalendarDays} highlights={[{label:'Começo',value:'Objetivo',detail:'o que precisa mudar'},{label:'Próximo',value:'Ação',detail:'o que fazer agora'},{label:'Tempo',value:'Marcos',detail:'datas importantes'},{label:'Revisão',value:'Quando mudar',detail:'ajuste o plano'}]} panels={[{title:'Etapas',body:'Divida trabalhos grandes apenas quando isso ajudar a enxergar o próximo passo.'},{title:'Execução',body:'O planejamento termina onde começa uma ação concreta.'},{title:'Revisão',body:'Atualize o plano quando a realidade mudar, não para manter uma versão antiga bonita.'}]}/>
    case '/historico': return <SectionPage eyebrow="Arquivo" title="Histórico" description="Guarde marcos, decisões e aprendizados que vale consultar no futuro." tone="slate" icon={Archive} highlights={[{label:'2024',value:'Arquivo',detail:'registros antigos'},{label:'2025',value:'Arquivo',detail:'registros antigos'},{label:'2026',value:'Atual',detail:'ano em andamento'},{label:'Revisão',value:'Quando útil',detail:'sem obrigação diária'}]} panels={[{title:'Marcos',body:'Resultados, experiências e mudanças que você quer lembrar.'},{title:'Aprendizados',body:'Decisões ou experiências que mudaram sua forma de agir.'},{title:'Encerramentos',body:'Registre o que terminou e o que não precisa continuar ocupando espaço.'}]}/>
    case '/tutorial': case '/guia': return <TutorialPage/>
    default: return <SectionPage eyebrow="404" title="Página não encontrada" description="Essa rota não existe no Nexus." tone="slate" icon={BookOpen} highlights={[]} panels={[]}/>
  }
}

export function App(){const pathname=usePathname(); return <NexusProvider><AppShell pathname={pathname}><RouteContent pathname={pathname}/></AppShell></NexusProvider>}
