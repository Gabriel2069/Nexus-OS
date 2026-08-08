import type { CSSProperties } from 'react'

type ProgressRingProps = { value: number; label: string; detail?: string; size?: 'sm' | 'md' | 'lg' }

export function ProgressRing({ value, label, detail, size = 'md' }: ProgressRingProps) {
  const safeValue = Math.max(0, Math.min(value, 100))
  return <div className={`progress-ring progress-ring--${size}`} style={{ '--progress': `${safeValue * 3.6}deg` } as CSSProperties}><div className="progress-ring__inner"><strong>{safeValue}%</strong><span>{label}</span>{detail && <small>{detail}</small>}</div></div>
}
