import { createContext, useContext, useState, type ReactNode } from 'react'

const KEY = 'contract-agent:started'

interface ContractState {
  /** Whether the agent has started today's contract. */
  started: boolean
  setStarted: (value: boolean) => void
}

const Ctx = createContext<ContractState | null>(null)

export function ContractStateProvider({ children }: { children: ReactNode }) {
  const [started, setStartedState] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '0'
    } catch {
      return true
    }
  })

  const setStarted = (value: boolean) => {
    setStartedState(value)
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      /* storage unavailable: keep in-memory state only */
    }
  }

  return <Ctx.Provider value={{ started, setStarted }}>{children}</Ctx.Provider>
}

export function useContractState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContractState must be used inside provider')
  return ctx
}
