import { createContext, useContext, useState, useCallback } from 'react'

interface MyDayContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  /** Set by the drawer when tasks load — used to show the badge dot on the nav button */
  incompleteTasks: number
  setIncompleteTasks: (n: number) => void
}

const MyDayContext = createContext<MyDayContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  incompleteTasks: 0,
  setIncompleteTasks: () => {},
})

export function MyDayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState(0)

  const open   = useCallback(() => setIsOpen(true), [])
  const close  = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return (
    <MyDayContext.Provider value={{ isOpen, open, close, toggle, incompleteTasks, setIncompleteTasks }}>
      {children}
    </MyDayContext.Provider>
  )
}

export function useMyDayContext() {
  return useContext(MyDayContext)
}
