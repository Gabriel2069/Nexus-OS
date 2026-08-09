import { nextBestMission } from './decision-engine'
import type { CalendarCommitment, NexusWorkspace } from '../types/nexus'

export type CalendarOccurrence = {
  id: string
  sourceId: string
  title: string
  category: string
  note: string | null
  start: Date
  end: Date
  isFixed: boolean
}

export type RoutineSuggestion = {
  kind: 'commitment' | 'focus' | 'transition' | 'recovery' | 'personal' | 'social' | 'hair' | 'family' | 'shutdown' | 'free'
  title: string
  detail: string
  durationMinutes?: number
  missionId?: string
  actionPath?: string
  actionLabel?: string
  optional?: boolean
}

export type RoutineContext = {
  now: Date
  current: CalendarOccurrence | null
  next: CalendarOccurrence | null
  today: CalendarOccurrence[]
  upcoming: CalendarOccurrence[]
  freeMinutes: number
  loadMinutes: number
  load: 'leve' | 'normal' | 'cheio'
  nextExam: CalendarOccurrence | null
  daysToExam: number | null
  suggestion: RoutineSuggestion
  later: RoutineSuggestion | null
}

const TZ = 'America/Sao_Paulo'

function localYmd(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function localWeekday(date: Date) {
  const key = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(key)
}

function localHour(date: Date) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(date)) % 24
}

function clock(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(value)
}

function atTime(ymd: string, value: string) {
  return new Date(`${ymd}T${value.slice(0, 8)}-03:00`)
}

function recurringOccurrence(item: CalendarCommitment, day: Date): CalendarOccurrence | null {
  if (!item.start_time || !item.end_time || !item.weekdays.length) return null
  const ymd = localYmd(day)
  if (item.active_from && ymd < item.active_from) return null
  if (item.active_until && ymd > item.active_until) return null
  if (!item.weekdays.includes(localWeekday(day))) return null
  return {
    id: `${item.id}:${ymd}`,
    sourceId: item.id,
    title: item.title,
    category: item.category,
    note: item.note,
    start: atTime(ymd, item.start_time),
    end: atTime(ymd, item.end_time),
    isFixed: item.is_fixed,
  }
}

export function occurrencesForDay(commitments: CalendarCommitment[], day: Date) {
  const ymd = localYmd(day)
  const output: CalendarOccurrence[] = []
  commitments.forEach((item) => {
    if (item.starts_at && item.ends_at) {
      const start = new Date(item.starts_at)
      const end = new Date(item.ends_at)
      const startYmd = localYmd(start)
      const endProbe = new Date(end.getTime() - 1000)
      if (ymd >= startYmd && ymd <= localYmd(endProbe)) {
        output.push({ id: item.id, sourceId: item.id, title: item.title, category: item.category, note: item.note, start, end, isFixed: item.is_fixed })
      }
      return
    }
    const occurrence = recurringOccurrence(item, day)
    if (occurrence) output.push(occurrence)
  })
  return output.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function upcomingOccurrences(commitments: CalendarCommitment[], now = new Date(), days = 8) {
  const output: CalendarOccurrence[] = []
  for (let index = 0; index < days; index += 1) {
    const day = new Date(now)
    day.setDate(day.getDate() + index)
    occurrencesForDay(commitments, day).forEach((item) => {
      if (item.end > now) output.push(item)
    })
  }
  return output.sort((a, b) => a.start.getTime() - b.start.getTime())
}

function isStudyLike(category: string) {
  return ['school', 'class', 'study', 'exam'].includes(category)
}

function suggestionForFreeWindow(workspace: NexusWorkspace, now: Date, today: CalendarOccurrence[], next: CalendarOccurrence | null, freeMinutes: number, load: RoutineContext['load'], nextExam: CalendarOccurrence | null, daysToExam: number | null): RoutineSuggestion {
  const day = localWeekday(now)
  const hour = localHour(now)
  const target = nextBestMission(workspace.missions, workspace.checkin)
  const recentSchool = [...today].reverse().find((event) => event.category === 'school' && event.end <= now && now.getTime() - event.end.getTime() <= 65 * 60_000)

  if (hour >= 22) return { kind: 'shutdown', title: 'Feche o dia', detail: 'Não comece outro bloco. Guarde o que ficou para amanhã e desacelere para dormir às 23h.', actionPath: '/rotinas', actionLabel: 'Fechamento' }

  if (recentSchool) return { kind: 'recovery', title: 'Almoço e pausa', detail: `Você saiu da escola às ${clock(recentSchool.end)}. Primeiro coma, descanse e mude de ritmo; depois o Nexus reorganiza o restante.`, durationMinutes: Math.min(50, freeMinutes), optional: true }

  if (next && freeMinutes <= 35) return { kind: 'transition', title: `Próximo: ${next.title}`, detail: `Começa às ${clock(next.start)}. Esse intervalo é para deslocamento, lanche, banho ou simplesmente respirar — não precisa virar uma tarefa.`, durationMinutes: freeMinutes, optional: true }

  if (day === 1 && hour >= 19) return { kind: 'personal', title: 'O dia já foi cheio', detail: 'Depois de escola integral e inglês, preserve a noite para você, família ou algum hobby. Estudo extra só se houver algo realmente urgente para amanhã.', optional: true }
  if (day === 4 && hour >= 19) return { kind: 'personal', title: 'Agora é hora de sair do modo estudo', detail: 'Plantão, Física e academia já ocuparam a tarde. Jante, fique com sua família e use o resto da noite sem obrigação.', optional: true }

  if (day === 3 && hour >= 19) return { kind: 'hair', title: 'Janela boa para cuidar de você', detail: 'A quarta já teve Bio Vest, redação e inglês. Se for dia de lavar o cabelo, faça a lavagem comum; se não, deixe a noite livre.', durationMinutes: 30, optional: true }

  if (day === 6 && hour >= 12 && hour < 17 && !today.some((event) => event.category === 'exam' && event.end > now)) {
    return { kind: 'hair', title: 'Sábado pode ser o cuidado do cabelo', detail: 'Se esta for a semana de tratamento, faça só o tratamento previsto. Depois, o restante da tarde fica livre para hobby, amigos ou família.', durationMinutes: 45, optional: true }
  }

  const urgentExam = nextExam && daysToExam != null && daysToExam <= 3
  const goodStudyWindow = freeMinutes >= 45 && ((day === 2 && hour >= 14 && hour < 18) || (day === 5 && hour >= 14 && hour < 17) || (day === 0 && hour >= 9 && hour < 17))

  if (goodStudyWindow && (target || urgentExam)) {
    const duration = Math.min(day === 0 ? 90 : 60, Math.max(25, freeMinutes - (next ? 20 : 0)))
    return {
      kind: 'focus',
      title: target?.title ?? (nextExam ? `Preparar ${nextExam.title}` : 'Bloco de estudo'),
      detail: target?.notes || (day === 2 ? 'Use este bloco para Matemática, História ou Química, priorizando a prova mais próxima e as maiores dúvidas.' : day === 0 ? 'Faça o bloco principal da semana e preserve o restante do domingo.' : 'Faça um bloco objetivo e pare quando ele terminar.'),
      durationMinutes: duration,
      missionId: target?.id,
      actionPath: `/foco?minutes=${duration}${target ? `&mission=${target.id}` : ''}`,
      actionLabel: `Começar ${duration} min`,
    }
  }

  if (day === 5 && hour >= 16) return { kind: 'social', title: 'Abra espaço para gente de verdade', detail: 'Sexta é uma boa hora para prolongar uma conversa, chamar alguém para lanchar, jogar, estudar junto ou combinar algo pequeno. Não transforme isso em checklist.', optional: true }
  if (day === 6 && hour >= 15) return { kind: 'social', title: 'Tarde livre de verdade', detail: 'Use o espaço para amigos, hobby ou ficar em casa com a família. Se quiser aprofundar uma amizade, prefira um convite simples e concreto.', optional: true }
  if (day === 0 && hour >= 16) return { kind: 'family', title: 'Preserve o resto do domingo', detail: 'Depois do principal bloco de estudo, o resto do dia pode ser família, hobby, descanso ou vida social. O Nexus não precisa preencher esse espaço.', optional: true }

  if (load === 'cheio') return { kind: 'recovery', title: 'Não coloque mais coisa neste dia', detail: 'Seu calendário já está cheio. Use o espaço que sobrou para comer, tomar banho, conversar, descansar ou fazer algo que você gosta.', optional: true }

  if (target && freeMinutes >= 45 && (urgentExam || ['Alta', 'Crítica'].includes(target.priority))) {
    const duration = Math.min(45, freeMinutes - (next ? 15 : 0))
    return { kind: 'focus', title: target.title, detail: target.notes || 'Há espaço para um bloco curto antes do próximo compromisso.', durationMinutes: duration, missionId: target.id, actionPath: `/foco?minutes=${duration}&mission=${target.id}`, actionLabel: `Começar ${duration} min` }
  }

  return { kind: 'free', title: 'Este espaço pode continuar livre', detail: 'Você não precisa transformar todo intervalo em produtividade. Escolha entre descanso, hobby, família ou conversar com alguém.', optional: true }
}

export function getRoutineContext(workspace: NexusWorkspace, now = new Date()): RoutineContext {
  const today = occurrencesForDay(workspace.calendarCommitments, now)
  const upcoming = upcomingOccurrences(workspace.calendarCommitments, now, 10)
  const current = today.find((item) => item.start <= now && item.end > now) ?? null
  const next = upcoming.find((item) => item.start > now) ?? null
  const cutoff = atTime(localYmd(now), '22:00:00')
  const nextBoundary = next && next.start < cutoff ? next.start : cutoff
  const freeMinutes = Math.max(0, Math.floor((nextBoundary.getTime() - now.getTime()) / 60_000))
  const loadMinutes = today.filter((event) => !['sleep', 'recovery'].includes(event.category)).reduce((sum, event) => sum + Math.max(0, (event.end.getTime() - event.start.getTime()) / 60_000), 0)
  const load: RoutineContext['load'] = loadMinutes >= 570 ? 'cheio' : loadMinutes >= 390 ? 'normal' : 'leve'
  const nextExam = upcoming.find((item) => item.category === 'exam' && item.start > now) ?? null
  const daysToExam = nextExam ? Math.max(0, Math.ceil((nextExam.start.getTime() - now.getTime()) / 86_400_000)) : null

  let suggestion: RoutineSuggestion
  if (current) {
    const fixedCopy = isStudyLike(current.category) || current.category === 'health'
      ? `Até ${clock(current.end)}. Agora é só estar aqui; o Nexus segura o que vem depois.`
      : current.note || `Até ${clock(current.end)}.`
    suggestion = { kind: 'commitment', title: current.title, detail: fixedCopy }
  } else {
    suggestion = suggestionForFreeWindow(workspace, now, today, next, freeMinutes, load, nextExam, daysToExam)
  }

  const after = next ? new Date(next.end.getTime() + 5 * 60_000) : new Date(now.getTime() + 90 * 60_000)
  const later = current || next ? suggestionForFreeWindow(workspace, after, occurrencesForDay(workspace.calendarCommitments, after), upcomingOccurrences(workspace.calendarCommitments, after, 2).find((item) => item.start > after) ?? null, 90, load, nextExam, daysToExam) : null

  return { now, current, next, today, upcoming, freeMinutes, loadMinutes, load, nextExam, daysToExam, suggestion, later }
}

export function formatOccurrenceTime(event: CalendarOccurrence) {
  const sameDay = localYmd(event.start) === localYmd(event.end)
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short' }).format(event.start).replace('.', '')
  if (event.end.getTime() - event.start.getTime() >= 23 * 60 * 60_000) return date
  return sameDay ? `${clock(event.start)}–${clock(event.end)}` : date
}
