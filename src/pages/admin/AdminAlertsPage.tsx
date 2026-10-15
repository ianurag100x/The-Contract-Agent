import { AlertsTab, SuspiciousTab } from '../../components/admin/tabs/SystemTabs'
import { useAdmin } from '../../state/admin'

export default function AdminAlertsPage() {
  const {
    alerts,
    resolveAlert,
    suspiciousActivity,
    investigateSuspicious,
    clearSuspicious,
  } = useAdmin()

  return (
    <div className="space-y-6">
      <AlertsTab alerts={alerts} resolveAlert={resolveAlert} />
      <SuspiciousTab
        suspiciousActivity={suspiciousActivity}
        investigateSuspicious={investigateSuspicious}
        clearSuspicious={clearSuspicious}
      />
    </div>
  )
}
