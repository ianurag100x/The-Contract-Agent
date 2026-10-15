import { useNavigate } from 'react-router-dom'
import { DashboardTab } from '../../components/admin/tabs/DashboardTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'
import { useNow } from '../../hooks/useNow'
import { getContractTimerState } from '../../lib/format'

export default function AdminOverviewPage() {
  const navigate = useNavigate()
  const {
    stats,
    contract,
    systemHealth,
    participants,
    alerts,
    verificationQueue,
    pauseContract,
    resumeContract,
    extendDeadlineMinutes,
    setSelectedParticipant,
    resolveAlert,
    retryVerification,
    manuallyVerify,
    rejectVerification,
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
  const activeAlertsCount = alerts.filter((a) => !a.resolved).length

  return (
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
      setActiveSection={(sec) => {
        if (sec === 'dashboard') navigate('/admin')
        else if (sec === 'participants') navigate('/admin/agents')
        else navigate(`/admin/${sec}`)
      }}
      setShowCreateContractModal={ui.setShowCreateContractModal}
      pauseContract={pauseContract}
      resumeContract={resumeContract}
      setSelectedParticipant={setSelectedParticipant}
      resolveAlert={resolveAlert}
      retryVerification={retryVerification}
      manuallyVerify={manuallyVerify}
      rejectVerification={rejectVerification}
    />
  )
}
