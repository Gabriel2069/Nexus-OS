type NexOSMarkProps = { size?: number | string; className?: string; title?: string }

export function NexOSMark({ size = 28, className = '', title = 'NexOS' }: NexOSMarkProps) {
  return <img className={`nexos-mark ${className}`} src="/nexos-mark.svg" width={size} height={size} alt={title} draggable="false" />
}
