export const UI_EVENTS = {
  command: 'nexus:command',
  quickAdd: 'nexus:quick-add',
  notifications: 'nexus:notifications',
  profile: 'nexus:profile',
} as const

export type QuickAddDetail = {
  dueDate?: string
  title?: string
  type?: 'mission' | 'inbox'
  projectId?: string
}

export function emitUI(event: keyof typeof UI_EVENTS, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(UI_EVENTS[event], { detail }))
}
