import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const items: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/',
    label: 'Oggi',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    to: '/percorso',
    label: 'Percorso',
    icon: (
      <>
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
      </>
    ),
  },
  {
    to: '/diario',
    label: 'Diario',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  },
  {
    to: '/impostazioni',
    label: 'Impostazioni',
    icon: (
      <>
        <path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2" />
        <circle cx="14" cy="6" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="16" cy="18" r="2" />
      </>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Sezioni">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
