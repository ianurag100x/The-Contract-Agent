import { useNavigate } from 'react-router-dom'
import { ObjectivesTab } from '../../components/admin/tabs/ObjectivesTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminObjectivesPage() {
  const navigate = useNavigate()
  const {
    contract,
    objectivePool,
    randomizeBalancedObjectives,
    updateMaxObjectives,
    deleteObjectiveFromContract,
  } = useAdmin()

  const ui = useAdminUI()
  const hasActiveContract = Boolean(
    contract &&
      (contract.status === 'active' ||
        contract.status === 'paused' ||
        contract.status === 'scheduled')
  )
  const isContractCancelled = contract.status === 'cancelled'

  return (
    <ObjectivesTab
      contract={contract}
      hasActiveContract={hasActiveContract}
      isContractCancelled={isContractCancelled}
      objectivePool={objectivePool}
      poolActionAlert={ui.poolActionAlert}
      setPoolActionAlert={ui.setPoolActionAlert}
      handleAddTaskFromPool={ui.handleAddTaskFromPool}
      randomizeBalancedObjectives={randomizeBalancedObjectives}
      updateMaxObjectives={updateMaxObjectives}
      deleteObjectiveFromContract={deleteObjectiveFromContract}
      setActiveSection={(sec) => {
        if (sec === 'dashboard') navigate('/admin')
        else navigate(`/admin/${sec}`)
      }}
      setTaskModalMode={ui.setTaskModalMode}
      setEditingTaskIndex={ui.setEditingTaskIndex}
      setTaskTitle={ui.setTaskTitle}
      setTaskCategory={ui.setTaskCategory}
      setTaskComplexity={ui.setTaskComplexity}
      setTaskTarget={ui.setTaskTarget}
      setTaskBounty={ui.setTaskBounty}
      setTaskMetric={ui.setTaskMetric}
      setTaskLogPattern={ui.setTaskLogPattern}
      setTaskAgentNote={ui.setTaskAgentNote}
      setTaskError={ui.setTaskError}
      setEditingObjective={ui.setEditingObjective}
    />
  )
}
