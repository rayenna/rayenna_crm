import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type MutableRefObject,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MyDayTabId } from '../components/my-day/types'
import { fetchTasks, MY_DAY_TASKS_QUERY_KEY } from '../lib/my-day-api'
import { recordMyDayUsage } from '../lib/myDayHabits'
import { useAuth } from './AuthContext'

interface MyDayContextValue {
  isOpen: boolean
  open: () => void
  /** Opens the drawer on the given tab (used from Zenith briefing, etc.). */
  openTab: (tab: MyDayTabId) => void
  close: () => void
  toggle: () => void
  /** Set by the drawer when tasks load — used to show the badge dot on the nav button */
  incompleteTasks: number
  setIncompleteTasks: (n: number) => void
  pendingTabRef: MutableRefObject<MyDayTabId | null>
}

const MyDayContext = createContext<MyDayContextValue>({
  isOpen: false,
  open: () => {},
  openTab: () => {},
  close: () => {},
  toggle: () => {},
  incompleteTasks: 0,
  setIncompleteTasks: () => {},
  pendingTabRef: { current: null },
})

export function MyDayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState(0)
  const pendingTabRef = useRef<MyDayTabId | null>(null)

  /** Nav badge + attention-row pin state — kept in sync when tasks change outside the drawer. */
  const { data: openTasks } = useQuery({
    queryKey: MY_DAY_TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!openTasks) return
    setIncompleteTasks(openTasks.filter((t) => !t.isDone && !t.isReminder).length)
  }, [openTasks])

  const trackOpen = useCallback(() => {
    if (user?.id) recordMyDayUsage(user.id, 'drawer_open')
  }, [user?.id])

  const open = useCallback(() => {
    pendingTabRef.current = null
    setIsOpen(true)
    trackOpen()
  }, [trackOpen])

  const openTab = useCallback((tab: MyDayTabId) => {
    pendingTabRef.current = tab
    setIsOpen(true)
    trackOpen()
  }, [trackOpen])

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (!v) trackOpen()
      return !v
    })
  }, [trackOpen])

  return (
    <MyDayContext.Provider
      value={{ isOpen, open, openTab, close, toggle, incompleteTasks, setIncompleteTasks, pendingTabRef }}
    >
      {children}
    </MyDayContext.Provider>
  )
}

export function useMyDayContext() {
  return useContext(MyDayContext)
}
