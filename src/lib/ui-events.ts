export const UI_EVENTS = {
  command: 'nexus:command',
  quickAdd: 'nexus:quick-add',
  notifications: 'nexus:notifications',
  profile: 'nexus:profile',
} as const

export function emitUI(event: keyof typeof UI_EVENTS) {
  window.dispatchEvent(new CustomEvent(UI_EVENTS[event]))
}
