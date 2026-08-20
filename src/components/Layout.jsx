import { Home, Images, LogOut, Trophy, User } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { to: '/app', label: 'Missões', icon: Home, end: true },
  { to: '/app/ranking', label: 'Ranking', icon: Trophy },
  { to: '/app/galeria', label: 'Galeria', icon: Images },
  { to: '/app/perfil', label: 'Perfil', icon: User },
]

export default function Layout({ children }) {
  const { guest, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-gold/25 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/brand/moldura.svg" alt="" className="h-9 w-14 object-contain" aria-hidden="true" />
            <div className="leading-tight">
              <p className="font-display font-extrabold text-xl">Missão 30</p>
              <p className="text-xs text-petroleum/60">The One Where Laris Turns Thirty</p>
            </div>
          </div>
          {guest && (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[10rem] truncate text-sm text-petroleum/70 sm:block">
                {guest.name}
              </span>
              <button
                onClick={logout}
                className="rounded-full p-2 text-petroleum/60 transition hover:bg-petroleum/10 hover:text-petroleum"
                aria-label="Sair da festa"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main key={pathname} className="mx-auto max-w-3xl animate-fade-in px-4 pt-5 safe-bottom">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/25 bg-cream/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-3xl">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                  isActive ? 'text-petroleum' : 'text-petroleum/45'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`rounded-full px-4 py-1.5 transition ${
                      isActive ? 'bg-tiffany/45' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
