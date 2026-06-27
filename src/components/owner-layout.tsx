import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Gift,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HeartHandshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@vitskyds/enroll-ui'

const NAV_ITEMS = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owner/customers', label: 'Customers', icon: Users },
  { to: '/owner/catch-up', label: 'Catch up', icon: HeartHandshake },
  { to: '/owner/products', label: 'Products', icon: Briefcase },
  { to: '/owner/rewards', label: 'Rewards', icon: Gift },
  { to: '/owner/program', label: 'Program', icon: Star },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
]

function NavItems({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-button-ghost-bg-hover hover:text-foreground',
              isActive && 'bg-navbar-bg-selected text-foreground',
              collapsed && 'justify-center px-2',
            )
          }
        >
          <Icon className="shrink-0" size={18} />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-background transition-all duration-200',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
      >
        <div className={cn('flex items-center h-14 border-b px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <span className="font-semibold text-sm">Enroll</span>}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems collapsed={collapsed} />
        </div>
        <div className="border-t p-2">
          <button
            onClick={handleSignOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-button-ghost-bg-hover hover:text-foreground transition-colors',
              collapsed && 'justify-center px-2',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col border-r bg-background transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between h-14 border-b px-4">
          <span className="font-semibold text-sm">Enroll</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
            <X size={16} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-button-ghost-bg-hover hover:text-foreground transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center h-14 border-b px-4 gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </Button>
          <span className="font-semibold text-sm">Enroll</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
