import { Activity, Archive, BarChart3, BookOpen, Brain, BriefcaseBusiness, CalendarCheck2, CalendarDays, CircleDollarSign, CircleHelp, Crosshair, Focus, GraduationCap, Inbox, LayoutDashboard, ListChecks, Mountain, Repeat2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
export type NavItem = { label: string; path: string; icon: LucideIcon; tone: string }
export type NavGroup = { label: string; items: NavItem[] }
export const navigation: NavGroup[] = [
  { label: 'Agora', items: [{ label: 'Início', path: '/', icon: LayoutDashboard, tone: 'slate' }, { label: 'Hoje', path: '/hoje', icon: Crosshair, tone: 'blue' }, { label: 'Calendário', path: '/calendario', icon: CalendarDays, tone: 'cyan' }, { label: 'Caixa de entrada', path: '/inbox', icon: Inbox, tone: 'amber' }]},
  { label: 'Fazer', items: [{ label: 'Missões', path: '/missoes', icon: ListChecks, tone: 'rose' }, { label: 'Rotinas', path: '/rotinas', icon: Repeat2, tone: 'green' }, { label: 'Foco', path: '/foco', icon: Focus, tone: 'indigo' }, { label: 'Projetos', path: '/projetos', icon: BriefcaseBusiness, tone: 'violet' }]},
  { label: 'Acompanhar', items: [{ label: 'Life RPG', path: '/life-rpg', icon: Sparkles, tone: 'violet' }, { label: 'Metas', path: '/metas', icon: Mountain, tone: 'indigo' }, { label: 'Insights', path: '/insights', icon: BarChart3, tone: 'cyan' }, { label: 'Revisão semanal', path: '/revisao', icon: CalendarCheck2, tone: 'indigo' }]},
  { label: 'Áreas', items: [{ label: 'Estudos', path: '/estudos', icon: GraduationCap, tone: 'blue' }, { label: 'Saúde', path: '/saude', icon: Activity, tone: 'green' }, { label: 'Finanças', path: '/financas', icon: CircleDollarSign, tone: 'amber' }, { label: 'Conhecimento', path: '/conhecimento', icon: Brain, tone: 'cyan' }]},
  { label: 'Sistema', items: [{ label: 'Tutorial', path: '/tutorial', icon: CircleHelp, tone: 'green' }, { label: 'Planejamento', path: '/planejamento', icon: CalendarDays, tone: 'indigo' }, { label: 'Histórico', path: '/historico', icon: Archive, tone: 'slate' }, { label: 'Biblioteca', path: '/biblioteca', icon: BookOpen, tone: 'cyan' }]},
]
