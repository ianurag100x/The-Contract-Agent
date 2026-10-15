import { Outlet, Link } from 'react-router-dom'
import { Shield, Plus, Layers, Users, Megaphone } from 'lucide-react'
import { useAdmin } from '../../state/admin'
import { AdminUIProvider, useAdminUI } from '../../state/AdminUIContext'
import { ManagingContractModal } from '../../components/admin/modals/ManagingContractModal'
import { TaskModal } from '../../components/admin/modals/TaskModal'
import {
  AnnouncementModal,
  WinnerModal,
  ObjectiveConfigModal,
  UserHistoryModal,
  OverrideModal,
  ExtraBountyModal,
  CreateContractModal,
} from '../../components/admin/modals/MiscModals'
import { adminApi } from '../../lib/api'

function AdminModals() {
  const admin = useAdmin()
  const ui = useAdminUI()

  return (
    <>
      <ManagingContractModal
        managingContractModal={ui.managingContractModal}
        setManagingContractModal={ui.setManagingContractModal}
        managedModalTab={ui.managedModalTab}
        setManagedModalTab={ui.setManagedModalTab}
        isLoadingManagedParticipants={ui.isLoadingManagedParticipants}
        managedParticipants={ui.managedParticipants}
        fetchManagedParticipants={ui.fetchManagedParticipants}
        contract={admin.contract}
        setOverrideModal={ui.setOverrideModal}
        setExtraBountyTarget={ui.setExtraBountyTarget}
        setOverrideReason={ui.setOverrideReason}
        onDeleteParticipant={async (p) => {
          if (
            !confirm(
              `Are you sure you want to remove agent "${p.name}" (#${p.tornId}) from Contract #${ui.managingContractModal?.id || admin.contract.number}? All their progress in this contract will be deleted.`
            )
          ) {
            return
          }
          try {
            const res = await adminApi.deleteParticipant(p.id)
            if (res?.success) {
              admin.setSelectedParticipant(null)
              if (ui.managingContractModal?.id) {
                await ui.fetchManagedParticipants(ui.managingContractModal.id)
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
        taskModalMode={ui.taskModalMode}
        setTaskModalMode={ui.setTaskModalMode}
        editingTaskIndex={ui.editingTaskIndex}
        taskTitle={ui.taskTitle}
        setTaskTitle={ui.setTaskTitle}
        taskCategory={ui.taskCategory}
        setTaskCategory={ui.setTaskCategory}
        taskComplexity={ui.taskComplexity}
        setTaskComplexity={ui.setTaskComplexity}
        taskTarget={ui.taskTarget}
        setTaskTarget={ui.setTaskTarget}
        taskBounty={ui.taskBounty}
        setTaskBounty={ui.setTaskBounty}
        taskMetric={ui.taskMetric}
        setTaskMetric={ui.setTaskMetric}
        taskLogPattern={ui.taskLogPattern}
        setTaskLogPattern={ui.setTaskLogPattern}
        taskAgentNote={ui.taskAgentNote}
        setTaskAgentNote={ui.setTaskAgentNote}
        taskError={ui.taskError}
        setTaskError={ui.setTaskError}
        addObjectiveToContract={admin.addObjectiveToContract}
        editObjectiveInContract={admin.editObjectiveInContract}
        addObjectiveToPool={admin.addObjectiveToPool}
      />

      <AnnouncementModal
        showAnnouncementModal={ui.showAnnouncementModal}
        setShowAnnouncementModal={ui.setShowAnnouncementModal}
        announcementTitle={ui.announcementTitle}
        setAnnouncementTitle={ui.setAnnouncementTitle}
        announcementMsg={ui.announcementMsg}
        setAnnouncementMsg={ui.setAnnouncementMsg}
        announcementType={ui.announcementType}
        setAnnouncementType={ui.setAnnouncementType}
        announcementTarget={ui.announcementTarget}
        setAnnouncementTarget={ui.setAnnouncementTarget}
        publishAnnouncement={admin.publishAnnouncement}
      />

      <WinnerModal
        showWinnerModal={ui.showWinnerModal}
        setShowWinnerModal={ui.setShowWinnerModal}
        contractNumber={admin.contract.number}
        winnerNameInput={ui.winnerNameInput}
        setWinnerNameInput={ui.setWinnerNameInput}
        endContract={async (w) => {
          admin.endContract(w)
        }}
      />

      <ObjectiveConfigModal
        editingObjective={ui.editingObjective}
        setEditingObjective={ui.setEditingObjective}
        updateObjectiveInPool={admin.updateObjectiveInPool}
      />

      <UserHistoryModal
        selectedUser={admin.selectedUser}
        setSelectedUser={admin.setSelectedUser}
      />

      <OverrideModal
        overrideModal={ui.overrideModal}
        setOverrideModal={ui.setOverrideModal}
        overrideReason={ui.overrideReason}
        setOverrideReason={ui.setOverrideReason}
        managingContractModal={ui.managingContractModal}
        contract={admin.contract}
        fetchManagedParticipants={ui.fetchManagedParticipants}
      />

      <ExtraBountyModal
        extraBountyTarget={ui.extraBountyTarget}
        setExtraBountyTarget={ui.setExtraBountyTarget}
        extraBountyAmount={ui.extraBountyAmount}
        setExtraBountyAmount={ui.setExtraBountyAmount}
        extraBountyReason={ui.extraBountyReason}
        setExtraBountyReason={ui.setExtraBountyReason}
        addExtraBounty={async (id, amt, rsn) => {
          await admin.addExtraBounty(id, amt, rsn)
        }}
      />

      <CreateContractModal
        showCreateContractModal={ui.showCreateContractModal}
        setShowCreateContractModal={ui.setShowCreateContractModal}
        newContractNumber={ui.newContractNumber}
        setNewContractNumber={ui.setNewContractNumber}
        newContractType={ui.newContractType}
        setNewContractType={ui.setNewContractType}
        newPrize={ui.newPrize}
        setNewPrize={ui.setNewPrize}
        newScheduledTime={ui.newScheduledTime}
        setNewScheduledTime={ui.setNewScheduledTime}
        createContract={async (c) => {
          admin.createContract(c)
        }}
      />
    </>
  )
}

function AdminHeader() {
  const { contract } = useAdmin()
  const ui = useAdminUI()

  const hasActiveContract = Boolean(
    contract &&
      (contract.status === 'active' ||
        contract.status === 'paused' ||
        contract.status === 'scheduled')
  )

  return (
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

      {/* Quick Actions Shortcuts (Direct Links) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => ui.setShowCreateContractModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
        >
          <Plus className="size-3.5" />
          Create Contract
        </button>
        <Link
          to="/admin/objectives"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
        >
          <Layers className="size-3.5 text-muted" />
          Objectives
        </Link>
        <Link
          to="/admin/agents"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
        >
          <Users className="size-3.5 text-muted" />
          Agents
        </Link>
        <button
          type="button"
          onClick={() => ui.setShowAnnouncementModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
        >
          <Megaphone className="size-3.5 text-accent" />
          Notch Broadcasts
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AdminUIProvider>
      <div className="space-y-6">
        <AdminHeader />
        {/* Render the specific page file without horizontal tab bar */}
        <Outlet />
        <AdminModals />
      </div>
    </AdminUIProvider>
  )
}
