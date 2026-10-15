import { useNavigate } from 'react-router-dom'
import { ContractsTab } from '../../components/admin/tabs/ContractsTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'
import { useNow } from '../../hooks/useNow'
import { getContractTimerState } from '../../lib/format'

export default function AdminContractsPage() {
  const navigate = useNavigate()
  const {
    contract,
    contractsList,
    refreshContracts,
    deleteContractFromDirectory,
    resumeContract,
    pauseContract,
    cancelContract,
    resetContractProgress,
  } = useAdmin()

  const ui = useAdminUI()
  const now = useNow(1000)
  const hasActiveContract = Boolean(
    contract &&
      (contract.status === 'active' ||
        contract.status === 'paused' ||
        contract.status === 'scheduled')
  )
  const contractTimer = getContractTimerState(contract, now)

  return (
    <ContractsTab
      contract={contract}
      hasActiveContract={hasActiveContract}
      contractTimer={contractTimer}
      contractsList={contractsList}
      setShowCreateContractModal={ui.setShowCreateContractModal}
      setShowExtendModal={ui.setShowExtendModal}
      setShowWinnerModal={ui.setShowWinnerModal}
      setWinnerNameInput={ui.setWinnerNameInput}
      setManagingContractModal={ui.setManagingContractModal}
      setActiveSection={(sec) => {
        if (sec === 'dashboard') navigate('/admin')
        else navigate(`/admin/${sec}`)
      }}
      resumeContract={resumeContract}
      pauseContract={pauseContract}
      cancelContract={cancelContract}
      resetContractProgress={resetContractProgress}
      refreshContracts={refreshContracts}
      deleteContractFromDirectory={deleteContractFromDirectory}
    />
  )
}
