import { TornSyncTab } from '../../components/admin/tabs/TornSyncTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminTornSyncPage() {
  const { contract, participants } = useAdmin()
  const ui = useAdminUI()

  return (
    <TornSyncTab
      contract={contract}
      participants={participants}
      syncApiKey={ui.syncApiKey}
      setSyncApiKey={ui.setSyncApiKey}
      syncUserTarget={ui.syncUserTarget}
      setSyncUserTarget={ui.setSyncUserTarget}
      syncLimit={ui.syncLimit}
      setSyncLimit={ui.setSyncLimit}
      isSyncingTorn={ui.isSyncingTorn}
      setIsSyncingTorn={ui.setIsSyncingTorn}
      syncResult={ui.syncResult}
      setSyncResult={ui.setSyncResult}
    />
  )
}
