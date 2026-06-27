import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DURATION_MS = 300

// Overlay drawer that slides in on open and out on close. Stays mounted through
// the exit transition so the close animation can play before unmounting.
export function Drawer({
  open,
  onClose,
  side = 'right',
  className,
  rootClassName,
  children,
}: {
  open: boolean
  onClose: () => void
  side?: 'right' | 'bottom'
  className?: string
  rootClassName?: string
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Mount on open; keep mounted through the exit transition before unmounting.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), DURATION_MS)
    return () => clearTimeout(t)
  }, [open])

  // Flush the hidden start pose to the browser, then flip to the shown state so
  // the transform transition has a baseline to animate from.
  useLayoutEffect(() => {
    if (mounted && open && !entered) {
      panelRef.current?.getBoundingClientRect()
      setEntered(true)
    }
  }, [mounted, open, entered])

  if (!mounted) return null

  const hiddenTransform = side === 'right' ? 'translate-x-full' : 'translate-y-full'
  const shownTransform = side === 'right' ? 'translate-x-0' : 'translate-y-0'

  return (
    <div className={cn('fixed inset-0 z-50', rootClassName)}>
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute bg-background shadow-xl transition-transform duration-300 ease-out',
          side === 'right' ? 'inset-y-0 right-0' : 'inset-x-0 bottom-0',
          entered ? shownTransform : hiddenTransform,
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
