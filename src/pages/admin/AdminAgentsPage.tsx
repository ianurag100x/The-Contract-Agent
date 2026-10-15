import { AgentsTab } from '../../components/admin/tabs/AgentsTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminAgentsPage() {
  const {
    users,
    participants,
    contract,
    setSelectedUser,
    suspendUser,
    restoreUser,
    deleteUser,
    refreshUserApiKey,
    refreshUsers,
  } = useAdmin()
  const ui = useAdminUI()

  // Match each agent with active participants list & contract status
  const contractActive =
    contract &&
    (contract.status === 'active' ||
      contract.status === 'paused' ||
      contract.status === 'scheduled')

  const enrichedAgents = users.map((user) => {
    // Check if user is in active participants list (by Torn ID or user ID)
    const activeParticipant = participants.find(
      (p) =>
        (p.tornId && user.tornId && p.tornId === user.tornId) ||
        p.id === user.id ||
        p.name.toLowerCase() === user.name.toLowerCase()
    )

    const isCurrentlyCompeting = Boolean(
      activeParticipant ||
        user.hasActiveContract ||
        (user.contractsEntered > 0 && user.contractsEntered > user.contractsCompleted)
    ) && contractActive

    const contractNum =
      user.activeContractNumber ||
      contract.number ||
      contract.id ||
      20021

    return {
      ...user,
      hasActiveContract: isCurrentlyCompeting,
      activeContractNumber: isCurrentlyCompeting ? contractNum : null,
    }
  })

  return (
    <AgentsTab
      agents={enrichedAgents}
      agentSearch={ui.userSearch}
      setAgentSearch={ui.setUserSearch}
      setSelectedAgent={setSelectedUser}
      suspendAgent={suspendUser}
      restoreAgent={restoreUser}
      deleteAgent={deleteUser}
      refreshAgentApiKey={refreshUserApiKey}
      refreshAgents={refreshUsers}
    />
  )
}
