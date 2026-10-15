import React from 'react'
import {
  X,
  Megaphone,
  Trophy,
  Clock,
  Plus,
  Coins,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { buttonClass } from '../../ui'
import { adminApi } from '../../../lib/api'
import type { Category, ContractType, Difficulty } from '../../../types'
import type { ObjectivePoolItem, AdminUserRecord } from '../types'

interface AnnouncementModalProps {
  showAnnouncementModal: boolean
  setShowAnnouncementModal: (v: boolean) => void
  announcementTitle: string
  setAnnouncementTitle: (v: string) => void
  announcementMsg: string
  setAnnouncementMsg: (v: string) => void
  announcementType: 'Warning' | 'Important' | 'Maintenance' | 'Information'
  setAnnouncementType: (v: 'Warning' | 'Important' | 'Maintenance' | 'Information') => void
  announcementTarget: 'All users' | 'Dashboard' | 'Contract page'
  setAnnouncementTarget: (v: 'All users' | 'Dashboard' | 'Contract page') => void
  publishAnnouncement: (ann: any) => void
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
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
  publishAnnouncement,
}) => {
  if (!showAnnouncementModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-accent" />
            <h3 className="text-base font-bold">Publish Notch Announcement</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAnnouncementModal(false)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-muted">Title (Headline)</label>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-muted">Message Body</label>
            <textarea
              rows={3}
              value={announcementMsg}
              onChange={(e) => setAnnouncementMsg(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted">Type / Tone</label>
              <select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
              >
                <option value="Warning">Warning (Amber)</option>
                <option value="Important">Important (Red)</option>
                <option value="Maintenance">Maintenance (Blue)</option>
                <option value="Information">Information (Green)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-muted">Display Target</label>
              <select
                value={announcementTarget}
                onChange={(e) => setAnnouncementTarget(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
              >
                <option value="All users">All users (Top Notch)</option>
                <option value="Dashboard">Dashboard</option>
                <option value="Contract page">Contract page</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setShowAnnouncementModal(false)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              publishAnnouncement({
                title: announcementTitle.trim() || 'Server Notice',
                message: announcementMsg.trim() || 'Important system update.',
                type: announcementType,
                target: announcementTarget,
              })
              setShowAnnouncementModal(false)
            }}
            className={`${buttonClass()} text-xs py-1.5`}
          >
            Broadcast to Notch Bar
          </button>
        </div>
      </div>
    </div>
  )
}

interface WinnerModalProps {
  showWinnerModal: boolean
  setShowWinnerModal: (v: boolean) => void
  contractNumber: number
  winnerNameInput: string
  setWinnerNameInput: (v: string) => void
  endContract: (winnerName?: string) => Promise<void>
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  showWinnerModal,
  setShowWinnerModal,
  contractNumber,
  winnerNameInput,
  setWinnerNameInput,
  endContract,
}) => {
  if (!showWinnerModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-medium" />
            <h3 className="text-base font-bold">End & Declare Contract</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowWinnerModal(false)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          End Contract #{contractNumber} immediately. Enter the confirmed winner's name, or leave empty if no winner is declared.
        </p>

        <div>
          <label className="block text-xs font-medium text-muted">Winner Name (Optional)</label>
          <input
            type="text"
            placeholder="Leave blank for No Winner"
            value={winnerNameInput}
            onChange={(e) => setWinnerNameInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setShowWinnerModal(false)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await endContract(winnerNameInput.trim() || undefined)
              setShowWinnerModal(false)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-medium px-3 py-1.5 text-xs font-bold text-black hover:bg-medium/90"
          >
            <CheckCircle2 className="size-4" /> End Contract
          </button>
        </div>
      </div>
    </div>
  )
}

interface ExtendModalProps {
  showExtendModal: boolean
  setShowExtendModal: (v: boolean) => void
  contractNumber: number
  extendMinutesInput: number
  setExtendMinutesInput: (v: number) => void
  extendDeadlineMinutes: (minutes: number) => Promise<void>
}

export const ExtendModal: React.FC<ExtendModalProps> = ({
  showExtendModal,
  setShowExtendModal,
  contractNumber,
  extendMinutesInput,
  setExtendMinutesInput,
  extendDeadlineMinutes,
}) => {
  if (!showExtendModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-accent" />
            <h3 className="text-base font-bold">Extend Contract Time</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowExtendModal(false)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Specify the number of minutes to extend Contract #{contractNumber}.
        </p>

        <div>
          <label className="block text-xs font-medium text-muted">Extension (Minutes)</label>
          <input
            type="number"
            min={1}
            max={10080}
            value={extendMinutesInput}
            onChange={(e) => setExtendMinutesInput(Math.max(1, parseInt(e.target.value, 10) || 60))}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none font-bold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setShowExtendModal(false)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await extendDeadlineMinutes(extendMinutesInput)
              setShowExtendModal(false)
            }}
            className={`${buttonClass()} text-xs py-1.5`}
          >
            Apply Extension
          </button>
        </div>
      </div>
    </div>
  )
}

interface ObjectiveConfigModalProps {
  editingObjective: ObjectivePoolItem | null
  setEditingObjective: (obj: ObjectivePoolItem | null) => void
  updateObjectiveInPool: (id: string, updates: Partial<ObjectivePoolItem>) => void
}

export const ObjectiveConfigModal: React.FC<ObjectiveConfigModalProps> = ({
  editingObjective,
  setEditingObjective,
  updateObjectiveInPool,
}) => {
  if (!editingObjective) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold">Objective Configuration</h3>
            <span className="text-xs text-muted">{editingObjective.objId} — {editingObjective.title}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingObjective(null)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <label className="block text-muted font-medium">Objective Title</label>
            <input
              type="text"
              value={editingObjective.title}
              onChange={(e) => setEditingObjective({ ...editingObjective, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
            />
          </div>
          <div>
            <label className="block text-muted font-medium">Category</label>
            <select
              value={editingObjective.category}
              onChange={(e) => setEditingObjective({ ...editingObjective, category: e.target.value as Category })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
            >
              <option value="combat">Combat</option>
              <option value="travel">Travel</option>
              <option value="energy">Energy</option>
              <option value="economy">Economy</option>
              <option value="general">General</option>
              <option value="faction">Faction</option>
            </select>
          </div>
          <div>
            <label className="block text-muted font-medium">Difficulty</label>
            <select
              value={editingObjective.difficulty}
              onChange={(e) => setEditingObjective({ ...editingObjective, difficulty: e.target.value as Difficulty })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <div>
            <label className="block text-muted font-medium">Required Target</label>
            <input
              type="number"
              value={editingObjective.target}
              onChange={(e) => setEditingObjective({ ...editingObjective, target: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-muted font-medium">Partial Bounty ($)</label>
            <input
              type="number"
              value={editingObjective.partialReward || 500000}
              onChange={(e) => setEditingObjective({ ...editingObjective, partialReward: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setEditingObjective(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              updateObjectiveInPool(editingObjective.objId, editingObjective)
              setEditingObjective(null)
            }}
            className={`${buttonClass()} text-xs py-1.5`}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

interface UserHistoryModalProps {
  selectedUser: AdminUserRecord | null
  setSelectedUser: (u: AdminUserRecord | null) => void
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  selectedUser,
  setSelectedUser,
}) => {
  if (!selectedUser) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold">{selectedUser.name} — Historical Record</h3>
            <p className="text-xs text-muted">Torn ID: #{selectedUser.tornId} · Joined {selectedUser.registeredDate}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-raised/40 p-2">
            <p className="text-[10px] text-muted">Entered</p>
            <p className="font-bold text-sm">{selectedUser.contractsEntered}</p>
          </div>
          <div className="rounded-lg bg-raised/40 p-2">
            <p className="text-[10px] text-muted">Completed</p>
            <p className="font-bold text-sm text-accent">{selectedUser.contractsCompleted}</p>
          </div>
          <div className="rounded-lg bg-raised/40 p-2">
            <p className="text-[10px] text-muted">Wins</p>
            <p className="font-bold text-sm text-medium">{selectedUser.wins}</p>
          </div>
          <div className="rounded-lg bg-raised/40 p-2">
            <p className="text-[10px] text-muted">Win Rate</p>
            <p className="font-bold text-sm">{selectedUser.completionRate}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted">Past Contract Participations</h4>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {selectedUser.contractHistory.map((ch) => (
              <li key={ch.contractNumber} className="flex items-center justify-between p-3 text-xs">
                <span className="font-bold text-fg">Contract #{ch.contractNumber}</span>
                <span className="font-semibold text-medium">{ch.rank}</span>
                <span className="text-muted">{ch.completionTime || 'In Progress'}</span>
                <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {ch.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  )
}

interface OverrideModalProps {
  overrideModal: {
    participantId: string
    userId: string
    objId: string | number
    objTitle: string
    action: 'mark_completed' | 'mark_uncompleted' | 'reset'
    contractId?: number
  } | null
  setOverrideModal: (modal: any) => void
  overrideReason: string
  setOverrideReason: (r: string) => void
  managingContractModal: any
  contract: any
  fetchManagedParticipants: (cId: number) => Promise<void>
  manualOverrideTask: (userId: string, objId: string, action: string, reason: string) => Promise<void>
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  overrideModal,
  setOverrideModal,
  overrideReason,
  setOverrideReason,
  managingContractModal,
  contract,
  fetchManagedParticipants,
  manualOverrideTask,
}) => {
  if (!overrideModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOverrideModal(null)}
              className="rounded-lg border border-line bg-surface p-1 text-muted hover:text-fg hover:border-accent"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <AlertOctagon className="size-4 text-extreme" />
            <h3 className="text-base font-bold text-fg">Manual Task Override</h3>
          </div>
          <button
            type="button"
            onClick={() => setOverrideModal(null)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
            <p className="text-muted">Task: <strong className="text-fg">{overrideModal.objTitle}</strong></p>
            <p className="text-muted">Action: <strong className="uppercase text-accent">{overrideModal.action.replace('_', ' ')}</strong></p>
          </div>

          <div>
            <label className="block text-muted font-medium">Mandatory Audit Reason *</label>
            <textarea
              rows={3}
              placeholder="Explain why this manual override is being applied..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setOverrideModal(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!overrideReason.trim()}
            onClick={async () => {
              if (!overrideReason.trim()) return
              const cId = overrideModal.contractId || (managingContractModal?.id ?? contract.number)
              try {
                const res = await adminApi.taskOverride({
                  participantId: overrideModal.participantId,
                  userId: overrideModal.userId,
                  contractId: cId,
                  contractObjectiveId: String(overrideModal.objId),
                  action: overrideModal.action,
                  reason: overrideReason.trim(),
                })
                if (res?.success) {
                  if (managingContractModal?.id) {
                    await fetchManagedParticipants(managingContractModal.id)
                  }
                  setOverrideModal(null)
                } else {
                  alert(res?.error || 'Failed to apply override.')
                }
              } catch (e: any) {
                alert(`Override error: ${e.message || String(e)}`)
              }
            }}
            className="rounded-lg bg-extreme px-4 py-2 text-xs font-bold text-white hover:bg-extreme/90 disabled:opacity-50"
          >
            Apply Override
          </button>
        </div>
      </div>
    </div>
  )
}

interface ExtraBountyModalProps {
  extraBountyTarget: { id: string; name: string } | null
  setExtraBountyTarget: (t: { id: string; name: string } | null) => void
  extraBountyAmount: number
  setExtraBountyAmount: (amt: number) => void
  extraBountyReason: string
  setExtraBountyReason: (r: string) => void
  addExtraBounty: (participantId: string, amount: number, reason: string) => Promise<void>
}

export const ExtraBountyModal: React.FC<ExtraBountyModalProps> = ({
  extraBountyTarget,
  setExtraBountyTarget,
  extraBountyAmount,
  setExtraBountyAmount,
  extraBountyReason,
  setExtraBountyReason,
  addExtraBounty,
}) => {
  if (!extraBountyTarget) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExtraBountyTarget(null)}
              className="rounded-lg border border-line bg-surface p-1 text-muted hover:text-fg hover:border-accent"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Coins className="size-4 text-accent" />
            <h3 className="text-base font-bold text-fg">Disburse Extra Bounty</h3>
          </div>
          <button
            type="button"
            onClick={() => setExtraBountyTarget(null)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-muted">Target Contractor: <strong className="text-fg">{extraBountyTarget.name}</strong></p>
          </div>

          <div>
            <label className="block text-muted font-medium">Bounty Amount ($)</label>
            <input
              type="number"
              step={50000}
              min={10000}
              value={extraBountyAmount}
              onChange={(e) => setExtraBountyAmount(Math.max(10000, parseInt(e.target.value, 10) || 10000))}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-muted font-medium">Reason for Grant</label>
            <input
              type="text"
              placeholder="e.g. Exceptional speed / Bounty bonus"
              value={extraBountyReason}
              onChange={(e) => setExtraBountyReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setExtraBountyTarget(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await addExtraBounty(
                extraBountyTarget.id,
                extraBountyAmount,
                extraBountyReason.trim() || 'Manual overseer bounty grant'
              )
              setExtraBountyTarget(null)
            }}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-ink hover:bg-accent/90"
          >
            Disburse +${(extraBountyAmount / 1000).toFixed(0)}k
          </button>
        </div>
      </div>
    </div>
  )
}

interface CreateContractModalProps {
  showCreateContractModal: boolean
  setShowCreateContractModal: (v: boolean) => void
  newContractNumber: number
  setNewContractNumber: (v: number) => void
  newContractType: ContractType
  setNewContractType: (v: ContractType) => void
  newPrize: string
  setNewPrize: (v: string) => void
  newScheduledTime: string
  setNewScheduledTime: (v: string) => void
  createContract: (c: any) => Promise<void>
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
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
  createContract,
}) => {
  if (!showCreateContractModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-accent" />
            <h3 className="text-base font-bold text-fg">Create New Contract</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateContractModal(false)}
            className="rounded-lg p-1.5 text-muted hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-xs text-muted">
          Configure parameters for the new contract. Once saved, you can add and customize individual tasks in the Objectives tab.
        </p>

        <div className="space-y-3.5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-medium text-muted">Contract ID (Number) *</label>
              <input
                type="number"
                value={newContractNumber}
                onChange={(e) => setNewContractNumber(Number(e.target.value))}
                placeholder="e.g. 1848"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-muted">Contract Type</label>
              <select
                value={newContractType}
                onChange={(e) => setNewContractType(e.target.value as ContractType)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
              >
                <option value="standard">Standard (1 Winner)</option>
                <option value="elite">Top 3 (Elite)</option>
                <option value="black">Top 10 (Black)</option>
                <option value="survival">Everyone (Survival)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-medium text-muted">Grand Prize</label>
              <input
                type="text"
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-muted">Scheduled Launch Date / Time</label>
              <input
                type="datetime-local"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 text-muted">
            <p className="text-[11px] leading-relaxed">
              💡 <strong>Tip:</strong> Saving as <strong>Draft</strong> keeps the contract offline until you add tasks. Choosing <strong>Schedule</strong> activates a countdown timer toward the scheduled launch time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setShowCreateContractModal(false)}
            className={`${buttonClass('secondary')} text-xs py-1.5`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await createContract({
                number: newContractNumber,
                type: newContractType,
                rewards: [{ place: '1st', reward: newPrize }],
                status: 'draft',
                objectives: [],
              })
              setShowCreateContractModal(false)
            }}
            className="rounded-lg border border-line bg-raised px-3 py-1.5 text-xs font-semibold text-fg hover:border-line-strong"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={async () => {
              await createContract({
                number: newContractNumber,
                type: newContractType,
                rewards: [{ place: '1st', reward: newPrize }],
                startDate: new Date(newScheduledTime).toISOString(),
                status: 'scheduled',
                objectives: [],
              })
              setShowCreateContractModal(false)
            }}
            className={`${buttonClass()} text-xs py-1.5`}
          >
            Schedule Contract #{newContractNumber}
          </button>
        </div>
      </div>
    </div>
  )
}
