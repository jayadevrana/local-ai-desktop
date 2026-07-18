import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

interface GlassPanelProps {
  children: ReactNode
  className?: string
}

export const GlassPanel = ({ children, className }: GlassPanelProps) => (
  <section className={cn('glass-panel', className)}>{children}</section>
)
