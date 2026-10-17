import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  History,
  Layers,
  LayoutDashboard,
  Megaphone,
  Plus,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  useAdmin,
  type ObjectivePoolItem,
} from '../state/admin'
import { useNow } from '../hooks/useNow'
import { getContractTimerState } from '../lib/format'
import type { Category, ContractType, Difficulty } from '../types'
import { adminApi } from '../lib/api'

// Subcomponent Tabs
import { DashboardTab } from '../components/admin/tabs/DashboardTab'
import { ContractsTab } from '../components/admin/tabs/ContractsTab'
import { ObjectivesTab } from '../components/admin/tabs/ObjectivesTab'
import { PatternTesterTab } from '../components/admin/tabs/PatternTesterTab'
import { TornSyncTab } from '../components/admin/tabs/TornSyncTab'
import { ParticipantsTab } from '../components/admin/tabs/ParticipantsTab'
import { RewardsTab } from '../components/admin/tabs/RewardsTab'
import { UsersTab } from '../components/admin/tabs/UsersTab'
import {
  SuspiciousTab,
  AlertsTab,
  AnnouncementsTab,
  ActivityTab,
  SettingsTab,
} from '../components/admin/tabs/SystemTabs'

// Modal Components
import { ManagingContractModal } from '../components/admin/modals/ManagingContractModal'
import { ParticipantDrawerModal } from '../components/admin/modals/ParticipantDrawerModal'
import { TaskModal } from '../components/admin/modals/TaskModal'
import {
  AnnouncementModal,
  WinnerModal,
  ExtendModal,
  ObjectiveConfigModal,
  UserHistoryModal,
  OverrideModal,
  ExtraBountyModal,
  CreateContractModal,
} from '../components/admin/modals/MiscModals'
import type { AdminNavSection } from '../components/admin/types'


export default function AdminPage() {
  const { section: sectionParam } = useParams<{ section?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Map route param or searchParam to valid AdminNavSection
  const validSection = (sectionParam || searchParams.get('section') || 'dashboard') as AdminNavSection
  const [activeSection, setActiveSectionState] = useState<AdminNavSection>(validSection)

  const setActiveSection = (sec: AdminNavSection) => {
    setActiveSectionState(sec)
    if (sec === 'dashboard') {
      navigate('/admin')
    } else {
      navigate(`/admin/${sec}`)
    }
  }

  useEffect(() => {
    const current = (sectionParam || searchParams.get('section') || 'dashboard') as AdminNavSection
    if (current && current !== activeSection) {
      setActiveSectionState(current)
    }
  }, [sectionParam, searchParams])
  const {
    stats,
    contract,
    contractsList,
    refreshContracts,
    updateMaxObjectives,
    createContract,
    deleteContractFromDirectory,

    addObjectiveToContract,
    editObjectiveInContract,
    deleteObjectiveFromContract,
    manualOverrideTask,
    addExtraBounty,

    objectivePool,
    addObjectiveToPool,
    updateObjectiveInPool,
    randomizeBalancedObjectives,

    pauseContract,
    resumeContract,
    endContract,
    extendDeadlineMinutes,
    cancelContract,
    resetContractProgress,

    verificationQueue,
    retryVerification,
    manuallyVerify,
    rejectVerification,

    participants,
    selectedParticipant,
    setSelectedParticipant,
    users,
    selectedUser,
    setSelectedUser,
    suspendUser,
    restoreUser,

    rewardsHistory,
    issueReward,
    retryReward,
    cancelReward,

    alerts,
    resolveAlert,
    suspiciousActivity,
    investigateSuspicious,
    clearSuspicious,

    announcements,
    activeAnnouncement,
    publishAnnouncement,
    toggleAnnouncementActive,
    dismissActiveAnnouncement,
    deleteAnnouncement,

    systemHealth,
    auditLogs,
  } = useAdmin()

  const now = useNow(1000)
  const hasActiveContract = Boolean(
    contract && (contract.status === 'active' || contract.status === 'paused' || contract.status === 'scheduled')
  )
  const contractTimer = getContractTimerState(contract, now)
  const isContractCancelled = contract.status === 'cancelled'

  // Modals & Action States
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

  // Contract Wizard & Lifecycle Form State
  const [newContractNumber, setNewContractNumber] = useState(
    contract.number ? contract.number + 1 : 1848
  )
  const [newContractType, setNewContractType] = useState<ContractType>('standard')
  const [newPrize, setNewPrize] = useState('$10,000,000 + 1× Xanax')
  const [newScheduledTime, setNewScheduledTime] = useState(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  )

  // Pattern Tester Form & Test State (§6.8)
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

  // Torn API Sync Form & Response State (§7)
  const [syncApiKey, setSyncApiKey] = useState('')
  const [syncUserTarget, setSyncUserTarget] = useState(participants[0]?.id || 'usr_1')
  const [syncLimit, setSyncLimit] = useState(20)
  const [isSyncingTorn, setIsSyncingTorn] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  // Contract Task Edit/Add Modal State
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

  // Extra Bounty Modal State
  const [extraBountyTarget, setExtraBountyTarget] = useState<{ id: string; name: string } | null>(null)
  const [extraBountyAmount, setExtraBountyAmount] = useState(250000)
  const [extraBountyReason, setExtraBountyReason] = useState('')

  // Task Override Modal State
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

  // Managing Contract Modal - Agent Progress & Manipulation State
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
          tornId: p.torn_user_id || p.tornId,
          rank: p.current_rank || p.rank || 1,
          completedCount: p.progress ?? p.completedCount ?? 0,
          totalCount: p.total_objectives || p.totalCount || (managingContractModal?.objectivesCount || 10),
          partialRewardsEarned: p.partial_rewards_earned || p.partialRewardsEarned || 0,
          lastActive: p.last_activity_at || p.lastActive || 'Just now',
          status: p.status || 'active',
          suspiciousReason: p.suspicious_reason,
          objectivesProgress:
            p.objectivesProgress && p.objectivesProgress.length > 0
              ? p.objectivesProgress
              : (managingContractModal?.objectives || contract.objectives || []).map(
                  (o: any, idx: number) => ({
                    id: o.objId || o.id || idx + 1,
                    title: o.title || o.name || `Objective ${idx + 1}`,
                    category: o.category || 'combat',
                    difficulty: o.difficulty || 'medium',
                    current: 0,
                    target: o.target || 1,
                    partialReward: o.partialReward || o.bounty || 500000,
                    partialRewardStatus: 'unearned',
                  })
                ),
        }))
        setManagedParticipants(mapped)

        // If a participant drawer is currently open, refresh it with the updated telemetry
        if (selectedParticipant) {
          const fresh = mapped.find((m: any) => m.id === selectedParticipant.id)
          if (fresh) {
            setSelectedParticipant(fresh)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load participants for contract:', e)
    } finally {
      setIsLoadingManagedParticipants(false)
    }
  }

  useEffect(() => {
    if (managingContractModal?.id) {
      fetchManagedParticipants(managingContractModal.id)
    } else {
      setManagedParticipants([])
    }
  }, [managingContractModal?.id])

  const handleAddTaskFromPool = (poolObj: ObjectivePoolItem) => {
    if (
      !contract ||
      (contract.status !== 'active' && contract.status !== 'paused' && contract.status !== 'scheduled')
    ) {
      setPoolActionAlert({
        type: 'error',
        message: `Cannot add task: No active or scheduled contract available (Current status: ${
          contract?.status || 'none'
        }). Please select or activate an ongoing contract first.`,
      })
      return
    }

    const effectivePattern =
      poolObj.log_pattern ||
      (poolObj.log_patterns && poolObj.log_patterns[0]?.template) ||
      OBJECTIVE_POOL.find((d) => d.objId === poolObj.objId || d.title.trim().toLowerCase() === poolObj.title.trim().toLowerCase())?.log_pattern ||
      ''

    const effectivePatterns =
      (poolObj.log_patterns && poolObj.log_patterns.length > 0)
        ? poolObj.log_patterns
        : (effectivePattern ? [{ key: `pat_${Date.now()}`, template: effectivePattern }] : [])

    addObjectiveToContract({
      title: poolObj.title,
      category: poolObj.category as Category,
      difficulty: poolObj.difficulty as Difficulty,
      complexity: poolObj.difficulty as any,
      target: poolObj.target || 1,
      bounty: poolObj.partialReward || 500000,
      partialReward: poolObj.partialReward || 500000,
      metric: poolObj.metric || 'count',
      agent_note: `Imported from Objective Master Pool (${poolObj.objId})`,
      log_pattern: effectivePattern,
      log_patterns: effectivePatterns,
      verification: 'log',
    })

    setPoolActionAlert({
      type: 'success',
      message: `Successfully added "${poolObj.title}" to Contract #${contract.number}!`,
    })
  }

  const filteredParticipants = participants.filter((p) => {
    if (participantFilter === 'all') return true
    return p.status === participantFilter
  })

  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.tornId).includes(userSearch)
    )
  })

  const activeAlertsCount = alerts.filter((a) => !a.resolved).length

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-hard/20 text-hard border border-hard/30">
              <Shield className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Overseer Control Center
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                hasActiveContract && contract.status === 'active'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : hasActiveContract && contract.status === 'paused'
                    ? 'bg-hard/15 text-hard border border-hard/30'
                    : hasActiveContract && contract.status === 'scheduled'
                      ? 'bg-medium/15 text-medium border border-medium/30'
                      : 'bg-raised text-muted border border-line'
              }`}
            >
              ● {hasActiveContract ? `Contract #${contract.number} (${contract.status})` : 'No Active Contracts'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Platform oversight, participant telemetry, objective verification, partial bounties & backend sync.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateContractModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
          >
            <Plus className="size-3.5" />
            Create Contract
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('objectives')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Layers className="size-3.5 text-muted" />
            Objectives
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('participants')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Users className="size-3.5 text-muted" />
            Participants
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('announcements')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Megaphone className="size-3.5 text-accent" />
            Notch Broadcasts
          </button>
        </div>
      </div>

      {/* Admin Navigation Bar with scroll indicators */}
      <div className="relative">
        <nav
          aria-label="Admin Navigation"
          className="scrollbar-none overflow-x-auto pb-1.5 scroll-smooth focus:outline-none"
        >
          <div className="inline-flex min-w-max gap-1 rounded-xl border border-line bg-surface p-1.5 shadow-sm">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'contracts', label: 'Contracts', icon: Sliders },
              { id: 'objectives', label: 'Objectives', icon: Layers },
              { id: 'patterns', label: 'Pattern Tester', icon: Sparkles, badgeTone: 'accent' },
              { id: 'torn-sync', label: 'Torn API Log Sync', icon: Radio, badge: 'v2', badgeTone: 'accent' },
              { id: 'participants', label: 'Participants', icon: Users, badge: contract.participants },
              { id: 'rewards', label: 'Rewards & Partial', icon: Trophy },
              { id: 'archive', label: 'Archive', icon: Archive },
              { id: 'users', label: 'Users', icon: UserCheck },
              {
                id: 'suspicious',
                label: 'Suspicious',
                icon: ShieldAlert,
                badge: suspiciousActivity.filter((s) => s.status === 'investigating').length,
                badgeTone: 'danger',
              },
              { id: 'alerts', label: 'Alerts & Health', icon: AlertTriangle, badge: activeAlertsCount, badgeTone: 'warning' },
              {
                id: 'announcements',
                label: 'Announcements',
                icon: Megaphone,
                badge: activeAnnouncement ? 'LIVE' : undefined,
                badgeTone: 'accent',
              },
              { id: 'activity', label: 'Activity Logs', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(({ id, label, icon: Icon, badge, badgeTone }) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id as AdminNavSection)}
                  className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-raised text-fg shadow-xs ring-1 ring-line-strong'
                      : 'text-muted hover:bg-raised/50 hover:text-fg'
                  }`}
                >
                  <Icon
                    className={`size-3.5 transition-colors ${
                      active
                        ? id === 'suspicious' || id === 'alerts'
                          ? 'text-hard'
                          : 'text-accent'
                        : 'group-hover:text-fg'
                    }`}
                  />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        badgeTone === 'danger'
                          ? 'bg-extreme/20 text-extreme'
                          : badgeTone === 'warning'
                            ? 'bg-hard/20 text-hard'
                            : badgeTone === 'accent'
                              ? 'bg-accent/20 text-accent animate-pulse'
                              : 'bg-raised text-muted'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Render Main Section Tabs */}
      {activeSection === 'dashboard' && (
        <DashboardTab
          stats={stats}
          contract={contract}
          hasActiveContract={hasActiveContract}
          contractTimer={contractTimer}
          systemHealth={systemHealth}
          participants={participants}
          alerts={alerts}
          activeAlertsCount={activeAlertsCount}
          verificationQueue={verificationQueue}
          setActiveSection={setActiveSection}
          setShowCreateContractModal={setShowCreateContractModal}
          pauseContract={pauseContract}
          resumeContract={resumeContract}
          extendDeadlineMinutes={extendDeadlineMinutes}
          setSelectedParticipant={setSelectedParticipant}
          resolveAlert={resolveAlert}
          retryVerification={retryVerification}
          manuallyVerify={manuallyVerify}
          rejectVerification={rejectVerification}
        />
      )}

      {(activeSection === 'contracts' || activeSection === 'archive') && (
        <ContractsTab
          contract={contract}
          hasActiveContract={hasActiveContract}
          contractTimer={contractTimer}
          contractsList={contractsList}
          setShowCreateContractModal={setShowCreateContractModal}
          setShowExtendModal={setShowExtendModal}
          setShowWinnerModal={setShowWinnerModal}
          setWinnerNameInput={setWinnerNameInput}
          setManagingContractModal={setManagingContractModal}
          setActiveSection={setActiveSection}
          resumeContract={resumeContract}
          pauseContract={pauseContract}
          cancelContract={cancelContract}
          resetContractProgress={resetContractProgress}
          refreshContracts={refreshContracts}
          deleteContractFromDirectory={deleteContractFromDirectory}
        />
      )}

      {activeSection === 'objectives' && (
        <ObjectivesTab
          contract={contract}
          hasActiveContract={hasActiveContract}
          isContractCancelled={isContractCancelled}
          objectivePool={objectivePool}
          poolActionAlert={poolActionAlert}
          setPoolActionAlert={setPoolActionAlert}
          handleAddTaskFromPool={handleAddTaskFromPool}
          randomizeBalancedObjectives={randomizeBalancedObjectives}
          updateMaxObjectives={updateMaxObjectives}
          deleteObjectiveFromContract={deleteObjectiveFromContract}
          setActiveSection={setActiveSection}
          setTaskModalMode={setTaskModalMode}
          setEditingTaskIndex={setEditingTaskIndex}
          setTaskTitle={setTaskTitle}
          setTaskCategory={setTaskCategory}
          setTaskComplexity={setTaskComplexity}
          setTaskTarget={setTaskTarget}
          setTaskBounty={setTaskBounty}
          setTaskMetric={setTaskMetric}
          setTaskLogPattern={setTaskLogPattern}
          setTaskAgentNote={setTaskAgentNote}
          setTaskError={setTaskError}
          setEditingObjective={setEditingObjective}
        />
      )}

      {activeSection === 'patterns' && (
        <PatternTesterTab
          testTemplate={testTemplate}
          setTestTemplate={setTestTemplate}
          testMetric={testMetric}
          setTestMetric={setTestMetric}
          testTarget={testTarget}
          setTestTarget={setTestTarget}
          testValueCapture={testValueCapture}
          setTestValueCapture={setTestValueCapture}
          testSamples={testSamples}
          setTestSamples={setTestSamples}
          isTestingPattern={isTestingPattern}
          setIsTestingPattern={setIsTestingPattern}
          patternTestResult={patternTestResult}
          setPatternTestResult={setPatternTestResult}
        />
      )}

      {activeSection === 'torn-sync' && (
        <TornSyncTab
          contract={contract}
          participants={participants}
          syncApiKey={syncApiKey}
          setSyncApiKey={setSyncApiKey}
          syncUserTarget={syncUserTarget}
          setSyncUserTarget={setSyncUserTarget}
          syncLimit={syncLimit}
          setSyncLimit={setSyncLimit}
          isSyncingTorn={isSyncingTorn}
          setIsSyncingTorn={setIsSyncingTorn}
          syncResult={syncResult}
          setSyncResult={setSyncResult}
        />
      )}

      {activeSection === 'participants' && (
        <ParticipantsTab
          filteredParticipants={filteredParticipants}
          participantFilter={participantFilter}
          setParticipantFilter={setParticipantFilter}
          setSelectedParticipant={setSelectedParticipant}
        />
      )}

      {activeSection === 'rewards' && (
        <RewardsTab
          rewardsHistory={rewardsHistory}
          issueReward={issueReward}
          retryReward={retryReward}
          cancelReward={cancelReward}
        />
      )}

      {activeSection === 'users' && (
        <UsersTab
          filteredUsers={filteredUsers}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          setSelectedUser={setSelectedUser}
          suspendUser={suspendUser}
          restoreUser={restoreUser}
        />
      )}

      {activeSection === 'suspicious' && (
        <SuspiciousTab
          suspiciousActivity={suspiciousActivity}
          investigateSuspicious={investigateSuspicious}
          clearSuspicious={clearSuspicious}
        />
      )}

      {activeSection === 'alerts' && (
        <AlertsTab alerts={alerts} resolveAlert={resolveAlert} />
      )}

      {activeSection === 'announcements' && (
        <AnnouncementsTab
          announcements={announcements}
          activeAnnouncement={activeAnnouncement}
          setShowAnnouncementModal={setShowAnnouncementModal}
          toggleAnnouncementActive={toggleAnnouncementActive}
          dismissActiveAnnouncement={dismissActiveAnnouncement}
          deleteAnnouncement={deleteAnnouncement}
        />
      )}

      {activeSection === 'activity' && <ActivityTab auditLogs={auditLogs} />}

      {activeSection === 'settings' && <SettingsTab />}

      {/* Render Popups and Modals */}
      {managingContractModal && (
        <ManagingContractModal
          managingContractModal={managingContractModal}
          setManagingContractModal={setManagingContractModal}
          managedModalTab={managedModalTab}
          setManagedModalTab={setManagedModalTab}
          managedParticipants={managedParticipants}
          isLoadingManagedParticipants={isLoadingManagedParticipants}
          fetchManagedParticipants={fetchManagedParticipants}
          setSelectedParticipant={setSelectedParticipant}
          setExtraBountyTarget={setExtraBountyTarget}
          setExtraBountyAmount={setExtraBountyAmount}
          setExtraBountyReason={setExtraBountyReason}
          refreshContracts={refreshContracts}
          deleteContractFromDirectory={deleteContractFromDirectory}
        />
      )}

      <ParticipantDrawerModal
        selectedParticipant={selectedParticipant}
        setSelectedParticipant={setSelectedParticipant}
        managingContractModal={managingContractModal}
        setManagingContractModal={setManagingContractModal}
        setExtraBountyTarget={setExtraBountyTarget}
        setExtraBountyAmount={setExtraBountyAmount}
        setExtraBountyReason={setExtraBountyReason}
        setOverrideModal={setOverrideModal}
        setOverrideReason={setOverrideReason}
        onDeleteParticipant={async (p) => {
          if (
            !confirm(
              `Are you sure you want to remove agent "${p.name}" (#${p.tornId}) from Contract #${managingContractModal?.id || contract.number}? All their progress in this contract will be deleted.`
            )
          ) {
            return
          }
          try {
            const res = await adminApi.deleteParticipant(p.id)
            if (res?.success) {
              setSelectedParticipant(null)
              if (managingContractModal?.id) {
                await fetchManagedParticipants(managingContractModal.id)
              }
            } else {
              alert('Failed to remove participant.')
            }
          } catch (e: any) {
            alert(`Error: ${e.message || String(e)}`)
          }
        }}
      />

      <TaskModal
        taskModalMode={taskModalMode}
        setTaskModalMode={setTaskModalMode}
        editingTaskIndex={editingTaskIndex}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        taskCategory={taskCategory}
        setTaskCategory={setTaskCategory}
        taskComplexity={taskComplexity}
        setTaskComplexity={setTaskComplexity}
        taskTarget={taskTarget}
        setTaskTarget={setTaskTarget}
        taskBounty={taskBounty}
        setTaskBounty={setTaskBounty}
        taskMetric={taskMetric}
        setTaskMetric={setTaskMetric}
        taskLogPattern={taskLogPattern}
        setTaskLogPattern={setTaskLogPattern}
        taskAgentNote={taskAgentNote}
        setTaskAgentNote={setTaskAgentNote}
        taskError={taskError}
        setTaskError={setTaskError}
        addObjectiveToContract={addObjectiveToContract}
        editObjectiveInContract={editObjectiveInContract}
        addObjectiveToPool={addObjectiveToPool}
      />

      <AnnouncementModal
        showAnnouncementModal={showAnnouncementModal}
        setShowAnnouncementModal={setShowAnnouncementModal}
        announcementTitle={announcementTitle}
        setAnnouncementTitle={setAnnouncementTitle}
        announcementMsg={announcementMsg}
        setAnnouncementMsg={setAnnouncementMsg}
        announcementType={announcementType}
        setAnnouncementType={setAnnouncementType}
        announcementTarget={announcementTarget}
        setAnnouncementTarget={setAnnouncementTarget}
        publishAnnouncement={publishAnnouncement}
      />

      <WinnerModal
        showWinnerModal={showWinnerModal}
        setShowWinnerModal={setShowWinnerModal}
        contractNumber={contract.number}
        winnerNameInput={winnerNameInput}
        setWinnerNameInput={setWinnerNameInput}
        endContract={async (w) => {
          endContract(w)
        }}
      />

      <ExtendModal
        showExtendModal={showExtendModal}
        setShowExtendModal={setShowExtendModal}
        contractNumber={contract.number}
        extendMinutesInput={extendMinutesInput}
        setExtendMinutesInput={setExtendMinutesInput}
        extendDeadlineMinutes={async (m) => {
          extendDeadlineMinutes(m)
        }}
      />

      <ObjectiveConfigModal
        editingObjective={editingObjective}
        setEditingObjective={setEditingObjective}
        updateObjectiveInPool={updateObjectiveInPool}
      />

      <UserHistoryModal
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />

      <OverrideModal
        overrideModal={overrideModal}
        setOverrideModal={setOverrideModal}
        overrideReason={overrideReason}
        setOverrideReason={setOverrideReason}
        managingContractModal={managingContractModal}
        contract={contract}
        fetchManagedParticipants={fetchManagedParticipants}
      />

      <ExtraBountyModal
        extraBountyTarget={extraBountyTarget}
        setExtraBountyTarget={setExtraBountyTarget}
        extraBountyAmount={extraBountyAmount}
        setExtraBountyAmount={setExtraBountyAmount}
        extraBountyReason={extraBountyReason}
        setExtraBountyReason={setExtraBountyReason}
        addExtraBounty={async (id, amt, rsn) => {
          await addExtraBounty(id, amt, rsn)
        }}
      />

      <CreateContractModal
        showCreateContractModal={showCreateContractModal}
        setShowCreateContractModal={setShowCreateContractModal}
        newContractNumber={newContractNumber}
        setNewContractNumber={setNewContractNumber}
        newContractType={newContractType}
        setNewContractType={setNewContractType}
        newPrize={newPrize}
        setNewPrize={setNewPrize}
        newScheduledTime={newScheduledTime}
        setNewScheduledTime={setNewScheduledTime}
        createContract={async (c) => {
          createContract(c)
        }}
      />
    </div>
  )
}
