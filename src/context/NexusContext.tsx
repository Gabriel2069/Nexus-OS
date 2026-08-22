import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { attributes as mockAttributes, missions as mockMissions, projects as mockProjects } from '../data/mock'
import { bootstrapNexus, completeMissionAtomic, createMission, createProject, ensureTodayJourney, finishFocusSession, getCurrentUser, loadWorkspace, saveDailyCheckin, startFocusSession, toggleRoutineCompletion, redeemReward, saveWeeklyReview, updateMission, updateProfile, updateProject } from '../lib/nexus-api'
import { buildDailySummary, buildNotifications, buildWeeklySummary, type NexusNotification } from '../lib/notification-engine'
import { getDailyOrientation, type ContextSuggestion } from '../lib/context-engine'
import { buildCommandPreview, parseNexosCommand, type NexosCommand } from '../lib/nexos-command-engine'
import { isSupabaseConfigured } from '../lib/supabase'
import type { DailyCheckin, FocusSession, NexusMission, NexusProject, NexusWorkspace, PlayerProfile, WeeklyReview } from '../types/nexus'

type NexusContextValue = {
  userId: string | null
  workspace: NexusWorkspace
  loading: boolean
  error: string | null
  notifications: NexusNotification[]
  dailySummary: NexusNotification
  weeklySummary: NexusNotification
  orientation: ReturnType<typeof getDailyOrientation>
  suggestions: ContextSuggestion[]
  refresh: () => Promise<void>
  interpretCommand: (input: string) => { command: NexosCommand; preview: ReturnType<typeof buildCommandPreview> }
  editProfile: (patch: Partial<Pick<PlayerProfile, 'display_name' | 'avatar_url' | 'class_name' | 'title' | 'motto' | 'timezone' | 'daily_xp_goal'>>) => Promise<void>
  addMission: (title: string, options?: Partial<NexusMission>) => Promise<void>
  completeMission: (id: string) => Promise<{ xp: number; coins: number }>
  processMission: (id: string, patch: Partial<Pick<NexusMission, 'status' | 'priority' | 'rank' | 'context' | 'due_at' | 'project_id' | 'attribute_id'>>) => Promise<void>
  addProject: (name: string, options?: Partial<NexusProject>) => Promise<void>
  editProject: (id: string, patch: Partial<Pick<NexusProject, 'status' | 'priority' | 'progress' | 'next_action' | 'due_at'>>) => Promise<void>
  saveCheckin: (input: Partial<DailyCheckin>) => Promise<void>
  beginFocus: (minutes: number, label?: string, missionId?: string | null) => Promise<FocusSession | null>
  endFocus: (sessionId: string, minutes: number, distractions?: number) => Promise<void>
  setRoutineItem: (itemId: string, completed: boolean) => Promise<void>
  claimReward: (rewardId: string) => Promise<string>
  saveReview: (review: Omit<WeeklyReview, 'id' | 'user_id'>) => Promise<void>
  mockAttributes: typeof mockAttributes
}

const emptyWorkspace: NexusWorkspace = {
  profile: null,
  missions: mockMissions.map((mission) => ({
    id: mission.id, user_id: 'mock', project_id: null, area_id: null, attribute_id: null, season_id: null, journey_id: null,
    title: mission.title, notes: null, mission_type: 'Missão', rank: mission.rank, status: mission.done ? 'Feita' : 'A fazer', priority: 'Média', context: mission.area,
    duration_minutes: Number.parseInt(mission.duration), energy: null, xp_base: mission.xp, xp_bonus: 0, coins_base: mission.coins, special_reward: null, due_at: null, completed_at: mission.done ? new Date().toISOString() : null,
  })),
  projects: mockProjects.map((project) => ({ id: project.id, user_id: 'mock', area_id: null, name: project.name, description: null, status: 'Ativo', priority: 'Média', level: project.level, xp: project.level * 450, progress: project.progress, next_action: project.nextAction, reward: null, due_at: null })),
  journey: null, checkin: null, dailyCheckins: [], focusSessions: [], routines: [], routineCompletions: [], activity: [], weeklyReviews: [], attributes: [], season: null, rewards: [], achievements: [], academicSchedule: [], academicEvents: [], calendarCommitments: [],
}

const NexusContext = createContext<NexusContextValue | null>(null)

export function NexusProvider({ children }: PropsWithChildren) {
  const [userId, setUserId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<NexusWorkspace>(emptyWorkspace)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) { setWorkspace(emptyWorkspace); setLoading(false); return }
    try {
      const user = await getCurrentUser()
      if (!user) return
      setUserId(user.id)
      await bootstrapNexus()
      await ensureTodayJourney(user.id)
      setWorkspace(await loadWorkspace(user.id))
      setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar o NexOS') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const adaptive = useMemo(() => {
    const now = new Date()
    return {
      notifications: buildNotifications(workspace, now),
      dailySummary: buildDailySummary(workspace, now),
      weeklySummary: buildWeeklySummary(workspace, now),
      orientation: getDailyOrientation(workspace, now),
    }
  }, [workspace])

  const interpretCommand = useCallback((input: string) => {
    const command = parseNexosCommand(input)
    return { command, preview: buildCommandPreview(command, workspace) }
  }, [workspace])

  const value = useMemo<NexusContextValue>(() => ({
    userId, workspace, loading, error, refresh, interpretCommand, mockAttributes,
    ...adaptive,
    suggestions: adaptive.orientation.suggestions,
    editProfile: async (patch) => { if (!userId) return; await updateProfile(userId, patch); await refresh() },
    addMission: async (title, options = {}) => { if (!userId) return; await createMission(userId, { title, status: 'A fazer', rank: 'C', priority: 'Média', xp_base: 60, coins_base: 10, ...options }); await refresh() },
    completeMission: async (id) => { if (!userId) { setWorkspace((current) => ({ ...current, missions: current.missions.filter((mission) => mission.id !== id) })); return { xp: 0, coins: 0 } } const result = await completeMissionAtomic(id); await refresh(); return { xp: result.xp_awarded, coins: result.coins_awarded } },
    processMission: async (id, patch) => { if (!userId) return; await updateMission(userId, id, patch); await refresh() },
    addProject: async (name, options = {}) => { if (!userId) return; await createProject(userId, { name, ...options }); await refresh() },
    editProject: async (id, patch) => { if (!userId) return; await updateProject(userId, id, patch); await refresh() },
    saveCheckin: async (input) => { if (!userId) { setWorkspace((current) => ({ ...current, checkin: { id: 'mock', user_id: 'mock', checkin_date: new Date().toISOString().slice(0, 10), energy: input.energy ?? null, focus: input.focus ?? null, stress: input.stress ?? null, sleep_quality: input.sleep_quality ?? null, sleep_hours: input.sleep_hours ?? null, mood: input.mood ?? null, note: input.note ?? null } })); return } await saveDailyCheckin(userId, input); await refresh() },
    beginFocus: async (minutes, label, missionId) => userId ? startFocusSession(userId, minutes, label, missionId) : null,
    endFocus: async (sessionId, minutes, distractions = 0) => { if (!userId) return; await finishFocusSession(userId, sessionId, minutes, distractions); await refresh() },
    claimReward: async (rewardId) => { if (!userId) return 'Recompensa simulada'; const result = await redeemReward(rewardId); await refresh(); return result.reward },
    saveReview: async (review) => { if (!userId) return; await saveWeeklyReview(userId, review); await refresh() },
    setRoutineItem: async (itemId, completed) => { if (!userId) return; await toggleRoutineCompletion(userId, itemId, completed); await refresh() },
  }), [userId, workspace, loading, error, refresh, adaptive, interpretCommand])

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
}

export function useNexus() { const value = useContext(NexusContext); if (!value) throw new Error('useNexus must be used inside NexusProvider'); return value }
