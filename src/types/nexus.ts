export type PlayerProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  class_name: string
  title: string
  motto: string | null
  level: number
  xp_total: number
  nexus_coins: number
  streak_current: number
  streak_best: number
  timezone: string
  settings: Record<string, unknown>
  daily_xp_goal: number
}

export type NexusMission = {
  id: string
  user_id: string
  project_id: string | null
  area_id: string | null
  attribute_id: string | null
  season_id: string | null
  journey_id: string | null
  title: string
  notes: string | null
  mission_type: 'Missão' | 'Boss' | 'Rotina' | 'Desafio' | 'Evento'
  rank: 'D' | 'C' | 'B' | 'A' | 'S'
  status: 'Inbox' | 'A fazer' | 'Em andamento' | 'Bloqueada' | 'Feita' | 'Cancelada'
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  context: string | null
  duration_minutes: number | null
  energy: string | null
  xp_base: number
  xp_bonus: number
  coins_base: number
  special_reward: string | null
  due_at: string | null
  completed_at: string | null
}

export type NexusProject = {
  id: string
  user_id: string
  area_id: string | null
  name: string
  description: string | null
  status: 'Ideia' | 'Ativo' | 'Em espera' | 'Concluído' | 'Arquivado'
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  level: number
  xp: number
  progress: number
  next_action: string | null
  reward: string | null
  due_at: string | null
}

export type NexusJourney = {
  id: string
  user_id: string
  journey_date: string
  title: string
  xp_goal: number
  xp_earned: number
  coins_earned: number
  combo_xp: number
  energy_start: number | null
  energy_end: number | null
  mood: string | null
  victory: string | null
  learning: string | null
  closed_at: string | null
}

export type DashboardSnapshot = {
  profile: PlayerProfile | null
  missions: NexusMission[]
  projects: NexusProject[]
  journey: NexusJourney | null
}

export type DailyCheckin = {
  id: string
  user_id: string
  checkin_date: string
  energy: number | null
  focus: number | null
  stress: number | null
  sleep_quality: number | null
  sleep_hours: number | null
  mood: string | null
  note: string | null
}

export type FocusSession = {
  id: string
  user_id: string
  mission_id: string | null
  label: string | null
  planned_minutes: number
  actual_minutes: number | null
  distraction_count: number
  status: 'active' | 'completed' | 'cancelled'
  started_at: string
  ended_at: string | null
  note: string | null
}

export type RoutineItem = {
  id: string
  user_id: string
  routine_id: string
  title: string
  duration_minutes: number | null
  xp_reward: number
  is_optional: boolean
  sort_order: number
}

export type Routine = {
  id: string
  user_id: string
  area_id: string | null
  name: string
  description: string | null
  icon: string | null
  period: 'morning' | 'afternoon' | 'evening' | 'anytime'
  days_of_week: number[]
  is_active: boolean
  sort_order: number
  routine_items?: RoutineItem[]
}

export type RoutineCompletion = {
  id: string
  routine_item_id: string
  completion_date: string
}

export type WeeklyReview = {
  id: string
  user_id: string
  week_start: string
  score: number | null
  wins: string[]
  friction: string[]
  adjustments: string[]
  next_week_focus: string | null
  note: string | null
}

export type ActivityEvent = {
  id: string
  event_type: string
  source_type: string | null
  source_id: string | null
  label: string | null
  xp_delta: number
  coins_delta: number
  metadata: Record<string, unknown>
  created_at: string
}

export type NexusWorkspace = DashboardSnapshot & {
  checkin: DailyCheckin | null
  dailyCheckins: DailyCheckin[]
  focusSessions: FocusSession[]
  routines: Routine[]
  routineCompletions: RoutineCompletion[]
  activity: ActivityEvent[]
  weeklyReviews: WeeklyReview[]
  attributes: NexusAttribute[]
  season: NexusSeason | null
  rewards: NexusReward[]
}

export type NexusAttribute = {
  id: string
  key: string
  label: string
  description: string | null
  icon: string | null
  color: string | null
  xp: number
  level: number
  sort_order: number
}

export type NexusSeason = {
  id: string
  name: string
  theme: string | null
  status: string
  starts_on: string | null
  ends_on: string | null
  xp_goal: number
  boss_name: string | null
  final_reward: string | null
}

export type NexusReward = {
  id: string
  name: string
  description: string | null
  category: string | null
  cost: number
  minimum_level: number
  is_active: boolean
}
