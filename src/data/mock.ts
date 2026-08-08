export type Mission = { id: string; title: string; area: string; rank: 'D' | 'C' | 'B' | 'A' | 'S'; xp: number; coins: number; done: boolean; duration: string }
export type Project = { id: string; name: string; area: string; status: string; progress: number; level: number; nextAction: string; tone: string }
export const missions: Mission[] = [
  { id: 'mission-1', title: 'Revisar neurofisiologia por 45 min', area: 'Conhecimento', rank: 'B', xp: 120, coins: 20, done: false, duration: '45 min' },
  { id: 'mission-2', title: 'Organizar próxima sessão de TdV', area: 'Criatividade', rank: 'B', xp: 140, coins: 24, done: false, duration: '60 min' },
  { id: 'mission-3', title: 'Treino do dia', area: 'Corpo', rank: 'C', xp: 80, coins: 14, done: true, duration: '50 min' },
]
export const projects: Project[] = [
  { id: 'project-1', name: 'Tessitura do Vazio', area: 'Criação', status: 'Em foco', progress: 74, level: 7, nextAction: 'Fechar estrutura do próximo arco', tone: 'violet' },
  { id: 'project-2', name: 'Nexus OS', area: 'Sistema', status: 'Em construção', progress: 41, level: 4, nextAction: 'Conectar Supabase e persistir missões', tone: 'blue' },
  { id: 'project-3', name: 'Acadêmico 2026', area: 'Estudos', status: 'Ativo', progress: 62, level: 6, nextAction: 'Preparar próxima bateria de revisão', tone: 'cyan' },
]
export const attributes = [
  { label: 'Conhecimento', level: 8, xp: 2860, tone: 'blue' }, { label: 'Disciplina', level: 7, xp: 2440, tone: 'indigo' }, { label: 'Corpo', level: 5, xp: 1720, tone: 'green' }, { label: 'Saúde', level: 6, xp: 2080, tone: 'emerald' }, { label: 'Criatividade', level: 9, xp: 3280, tone: 'violet' }, { label: 'Finanças', level: 4, xp: 1340, tone: 'amber' }, { label: 'Conexões', level: 5, xp: 1580, tone: 'rose' }, { label: 'Espiritualidade', level: 6, xp: 1940, tone: 'slate' },
]
