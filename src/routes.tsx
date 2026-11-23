import { Link, Outlet, ScrollRestoration, type RouteObject } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.tsx'
import { DiaryPage } from './pages/DiaryPage.tsx'
import { LessonPage } from './pages/LessonPage.tsx'
import { PathPage } from './pages/PathPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { TodayPage } from './pages/TodayPage.tsx'
import ui from './ui.module.css'

function Layout() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <BottomNav />
      <ScrollRestoration />
    </>
  )
}

function NotFoundPage() {
  return (
    <div className={ui.page}>
      <h1 className={ui.title}>Pagina non trovata</h1>
      <p>
        <Link to="/">Torna a Oggi</Link>
      </p>
    </div>
  )
}

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'percorso', element: <PathPage /> },
      { path: 'lezione/:id', element: <LessonPage /> },
      { path: 'diario', element: <DiaryPage /> },
      { path: 'impostazioni', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
