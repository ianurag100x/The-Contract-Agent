import { ActivityTab } from '../../components/admin/tabs/SystemTabs'
import { useAdmin } from '../../state/admin'

export default function AdminActivityPage() {
  const { auditLogs } = useAdmin()

  return <ActivityTab auditLogs={auditLogs} />
}
