import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ObjectivePoolItem, Category } from '../types'
import { adminApi } from '../lib/api'
import { useAdmin } from '../state/admin'

interface AdminUIContextType {
  // Modal visibility & form controls
  showAnnouncementModal: boolean
  setShowAnnouncementModal: (v: boolean) => void
  announcementTitle: string
  setAnnouncementTitle: (v: string) => void
  announcementMsg: string
  setAnnouncementMsg: (v: string) => void
  announcementType: 'Information' | 'Warning' | 'Important' | 'Maintenance'
  setAnnouncementType: (v: 'Information' | 'Warning' | 'Important' | 'Maintenance') => void
  announcementTarget: 'Dashboard' | 'Contract page' | 'All users'
  setAnnouncementTarget: (v: 'Dashboard' | 'Contract page' | 'All users') => void

  showWinnerModal: boolean
  setShowWinnerModal: (v: boolean) => void
  winnerNameInput: string
  setWinnerNameInput: (v: string) => void

  showExtendModal: boolean
  setShowExtendModal: (v: boolean) => void
  extendMinutesInput: number
  setExtendMinutesInput: (v: number) => void

  showCreateContractModal: boolean
  setShowCreateContractModal: (v: boolean) => void
  newContractNumber: number
  setNewContractNumber: (v: number) => void
  newContractType: any
  setNewContractType: (v: any) => void
  newPrize: string
  setNewPrize: (v: string) => void
  newScheduledTime: string
  setNewScheduledTime: (v: string) => void

  managingContractModal: any | null
  setManagingContractModal: (v: any | null) => void
  managedParticipants: any[]
  setManagedParticipants: (v: any[]) => void
  isLoadingManagedParticipants: boolean
  managedModalTab: 'controls' | 'agents'
  setManagedModalTab: (v: 'controls' | 'agents') => void
  fetchManagedParticipants: (contractId: number) => Promise<void>

  editingObjective: ObjectivePoolItem | null
  setEditingObjective: (v: ObjectivePoolItem | null) => void

  participantFilter: 'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'
  setParticipantFilter: (v: 'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error') => void

  userSearch: string
  setUserSearch: (v: string) => void

  // Pattern tester
  testTemplate: string
  setTestTemplate: (v: string) => void
  testMetric: 'count' | 'sum' | 'distinct'
  setTestMetric: (v: 'count' | 'sum' | 'distinct') => void
  testTarget: number
  setTestTarget: (v: number) => void
  testValueCapture: string
  setTestValueCapture: (v: string) => void
  testSamples: string
  setTestSamples: (v: string) => void
  isTestingPattern: boolean
  setIsTestingPattern: (v: boolean) => void
  patternTestResult: any
  setPatternTestResult: (v: any) => void

  // Torn sync
  syncApiKey: string
  setSyncApiKey: (v: string) => void
  syncUserTarget: string
  setSyncUserTarget: (v: string) => void
  syncLimit: number
  setSyncLimit: (v: number) => void
  isSyncingTorn: boolean
  setIsSyncingTorn: (v: boolean) => void
  syncResult: any
  setSyncResult: (v: any) => void

  // Task edit/create modal
  taskModalMode: 'create' | 'edit' | null
  setTaskModalMode: (v: 'create' | 'edit' | null) => void
  editingTaskIndex: number
  setEditingTaskIndex: (v: number) => void
  taskTitle: string
  setTaskTitle: (v: string) => void
  taskCategory: Category
  setTaskCategory: (v: Category) => void
  taskComplexity: 'easy' | 'medium' | 'hard' | 'extreme'
  setTaskComplexity: (v: 'easy' | 'medium' | 'hard' | 'extreme') => void
  taskTarget: number
  setTaskTarget: (v: number) => void
  taskBounty: number
  setTaskBounty: (v: number) => void
  taskMetric: 'count' | 'sum' | 'distinct'
  setTaskMetric: (v: 'count' | 'sum' | 'distinct') => void
  taskLogPattern: string
  setTaskLogPattern: (v: string) => void
  taskAgentNote: string
  setTaskAgentNote: (v: string) => void
  taskError: string | null
  setTaskError: (v: string | null) => void

  // Extra bounty modal
  extraBountyTarget: { id: string; name: string } | null
  setExtraBountyTarget: (v: { id: string; name: string } | null) => void
  extraBountyAmount: number
  setExtraBountyAmount: (v: number) => void
  extraBountyReason: string
  setExtraBountyReason: (v: string) => void

  // Override modal
  overrideModal: {
    participantId: string
    userId: string
    objId: string | number
    objTitle: string
    action: 'mark_completed' | 'mark_uncompleted' | 'reset'
    contractId?: number
  } | null
  setOverrideModal: (v: any) => void
  overrideReason: string
  setOverrideReason: (v: string) => void

  poolActionAlert: { type: 'error' | 'warning' | 'success'; message: string } | null
  setPoolActionAlert: (v: { type: 'error' | 'warning' | 'success'; message: string } | null) => void

  handleAddTaskFromPool: (poolObj: ObjectivePoolItem) => void
}

const AdminUIContext = createContext<AdminUIContextType | null>(null)

export function AdminUIProvider({ children }: { children: ReactNode }) {
  const { contract, participants, addObjectiveToContract } = useAdmin()

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showCreateContractModal, setShowCreateContractModal] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('Contract Ending Soon')
  const [announcementMsg, setAnnouncementMsg] = useState(
    'Only 60 minutes remain to verify today’s objectives for Contract #1847.'
  )
  const [announcementType, setAnnouncementType] = useState<
    'Information' | 'Warning' | 'Important' | 'Maintenance'
  >('Warning')
  const [announcementTarget, setAnnouncementTarget] = useState<
    'Dashboard' | 'Contract page' | 'All users'
  >('All users')

  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winnerNameInput, setWinnerNameInput] = useState('')

  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendMinutesInput, setExtendMinutesInput] = useState(60)

  const [managingContractModal, setManagingContractModal] = useState<any | null>(null)
  const [editingObjective, setEditingObjective] = useState<ObjectivePoolItem | null>(null)
  const [participantFilter, setParticipantFilter] = useState<
    'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'
  >('all')
  const [userSearch, setUserSearch] = useState('')

  const [newContractNumber, setNewContractNumber] = useState(
    contract?.number ? contract.number + 1 : 1848
  )
  const [newContractType, setNewContractType] = useState<any>('standard')
  const [newPrize, setNewPrize] = useState('$10,000,000 + 1× Xanax')
  const [newScheduledTime, setNewScheduledTime] = useState(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  )

  const [testTemplate, setTestTemplate] = useState(
    'You used {energy:int} energy attacking {opponent:text} and defeated them'
  )
  const [testMetric, setTestMetric] = useState<'count' | 'sum' | 'distinct'>('count')
  const [testTarget, setTestTarget] = useState(10)
  const [testValueCapture, setTestValueCapture] = useState('energy')
  const [testSamples, setTestSamples] = useState(
    '23:41:35 - 13/10/26 You used 25 energy attacking PlayerB and defeated them\n23:45:10 - 13/10/26 You used 25 energy attacking PlayerC and defeated them'
  )
  const [isTestingPattern, setIsTestingPattern] = useState(false)
  const [patternTestResult, setPatternTestResult] = useState<any>(null)

  const [syncApiKey, setSyncApiKey] = useState('')
  const [syncUserTarget, setSyncUserTarget] = useState(participants?.[0]?.id || 'usr_1')
  const [syncLimit, setSyncLimit] = useState(20)
  const [isSyncingTorn, setIsSyncingTorn] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingTaskIndex, setEditingTaskIndex] = useState<number>(-1)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState<Category>('combat')
  const [taskComplexity, setTaskComplexity] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('easy')
  const [taskTarget, setTaskTarget] = useState(10)
  const [taskBounty, setTaskBounty] = useState(500000)
  const [taskMetric, setTaskMetric] = useState<'count' | 'sum' | 'distinct'>('count')
  const [taskLogPattern, setTaskLogPattern] = useState('')
  const [taskAgentNote, setTaskAgentNote] = useState('')
  const [taskError, setTaskError] = useState<string | null>(null)

  const [extraBountyTarget, setExtraBountyTarget] = useState<{ id: string; name: string } | null>(null)
  const [extraBountyAmount, setExtraBountyAmount] = useState(250000)
  const [extraBountyReason, setExtraBountyReason] = useState('')

  const [overrideModal, setOverrideModal] = useState<{
    participantId: string
    userId: string
    objId: string | number
    objTitle: string
    action: 'mark_completed' | 'mark_uncompleted' | 'reset'
    contractId?: number
  } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [poolActionAlert, setPoolActionAlert] = useState<{
    type: 'error' | 'warning' | 'success'
    message: string
  } | null>(null)

  const [managedParticipants, setManagedParticipants] = useState<any[]>([])
  const [isLoadingManagedParticipants, setIsLoadingManagedParticipants] = useState(false)
  const [managedModalTab, setManagedModalTab] = useState<'controls' | 'agents'>('agents')

  const fetchManagedParticipants = async (contractId: number) => {
    setIsLoadingManagedParticipants(true)
    try {
      const res = await adminApi.getParticipants(contractId)
      if (res && Array.isArray(res)) {
        const mapped = res.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.torn_username || p.name,
          tornId: p.torn_id || p.tornId,
          rank: p.rank || 1,
          completedCount: p.completed_count ?? p.completedCount ?? 0,
          totalCount: p.total_count ?? p.totalCount ?? (contract?.objectives?.length || 10),
          lastActive: 'Active now',
          status: p.status || 'active',
          partialRewardsEarned: p.partial_rewards_earned || 0,
          objectives: p.objectives || [],
        }))
        setManagedParticipants(mapped)
      }
    } catch (e) {
      console.error('Failed to fetch contract participants:', e)
    } finally {
      setIsLoadingManagedParticipants(false)
    }
  }

  const handleAddTaskFromPool = (poolObj: ObjectivePoolItem) => {
    if (!contract || !contract.objectives) return
    const max = contract.maxObjectives || 10
    if (contract.objectives.length >= max) {
      setPoolActionAlert({
        type: 'error',
        message: `Cannot add task: Contract capacity reached (${contract.objectives.length}/${max}). Increase maximum slots first.`,
      })
      return
    }

    const exists = contract.objectives.some(
      (o: any) => o.title.toLowerCase() === poolObj.title.toLowerCase()
    )
    if (exists) {
      setPoolActionAlert({
        type: 'warning',
        message: `Task "${poolObj.title}" is already included in this contract.`,
      })
      return
    }

    const pattern = (poolObj as any).log_pattern || (poolObj as any).logPattern || (poolObj.log_patterns && poolObj.log_patterns[0]?.template) || ''
    addObjectiveToContract({
      title: poolObj.title,
      category: poolObj.category,
      complexity: poolObj.complexity,
      target: poolObj.target,
      bounty: poolObj.bounty,
      partialReward: poolObj.bounty,
      metric: poolObj.metric || 'count',
      log_pattern: pattern,
      logPattern: pattern,
      log_patterns: poolObj.log_patterns || (pattern ? [{ key: `pat_${Date.now()}`, template: pattern }] : []),
      agent_note: (poolObj as any).agent_note || (poolObj as any).agentNote || '',
    })

    setPoolActionAlert({
      type: 'success',
      message: `Added "${poolObj.title}" to active Contract #${contract.number}.`,
    })
  }

  return (
    <AdminUIContext.Provider
      value={{
        showAnnouncementModal,
        setShowAnnouncementModal,
        announcementTitle,
        setAnnouncementTitle,
        announcementMsg,
        setAnnouncementMsg,
        announcementType,
        setAnnouncementType,
        announcementTarget,
        setAnnouncementTarget,

        showWinnerModal,
        setShowWinnerModal,
        winnerNameInput,
        setWinnerNameInput,

        showExtendModal,
        setShowExtendModal,
        extendMinutesInput,
        setExtendMinutesInput,

        showCreateContractModal,
        setShowCreateContractModal,
        newContractNumber,
        setNewContractNumber,
        newContractType,
        setNewContractType,
        newPrize,
        setNewPrize,
        newScheduledTime,
        setNewScheduledTime,

        managingContractModal,
        setManagingContractModal,
        managedParticipants,
        setManagedParticipants,
        isLoadingManagedParticipants,
        managedModalTab,
        setManagedModalTab,
        fetchManagedParticipants,

        editingObjective,
        setEditingObjective,

        participantFilter,
        setParticipantFilter,

        userSearch,
        setUserSearch,

        testTemplate,
        setTestTemplate,
        testMetric,
        setTestMetric,
        testTarget,
        setTestTarget,
        testValueCapture,
        setTestValueCapture,
        testSamples,
        setTestSamples,
        isTestingPattern,
        setIsTestingPattern,
        patternTestResult,
        setPatternTestResult,

        syncApiKey,
        setSyncApiKey,
        syncUserTarget,
        setSyncUserTarget,
        syncLimit,
        setSyncLimit,
        isSyncingTorn,
        setIsSyncingTorn,
        syncResult,
        setSyncResult,

        taskModalMode,
        setTaskModalMode,
        editingTaskIndex,
        setEditingTaskIndex,
        taskTitle,
        setTaskTitle,
        taskCategory,
        setTaskCategory,
        taskComplexity,
        setTaskComplexity,
        taskTarget,
        setTaskTarget,
        taskBounty,
        setTaskBounty,
        taskMetric,
        setTaskMetric,
        taskLogPattern,
        setTaskLogPattern,
        taskAgentNote,
        setTaskAgentNote,
        taskError,
        setTaskError,

        extraBountyTarget,
        setExtraBountyTarget,
        extraBountyAmount,
        setExtraBountyAmount,
        extraBountyReason,
        setExtraBountyReason,

        overrideModal,
        setOverrideModal,
        overrideReason,
        setOverrideReason,

        poolActionAlert,
        setPoolActionAlert,
        handleAddTaskFromPool,
      }}
    >
      {children}
    </AdminUIContext.Provider>
  )
}

export function useAdminUI() {
  const ctx = useContext(AdminUIContext)
  if (!ctx) {
    throw new Error('useAdminUI must be used within an AdminUIProvider')
  }
  return ctx
}
