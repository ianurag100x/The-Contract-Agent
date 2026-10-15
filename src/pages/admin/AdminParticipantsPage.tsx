import { ParticipantsTab } from '../../components/admin/tabs/ParticipantsTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminParticipantsPage() {
  const { participants, setSelectedParticipant } = useAdmin()
  const ui = useAdminUI()

  const filteredParticipants = participants.filter((p) => {
    if (ui.participantFilter === 'all') return true
    if (ui.participantFilter === 'active') return p.completedCount > 0
    if (ui.participantFilter === 'inactive') return p.completedCount === 0
    if (ui.participantFilter === 'completed') return p.completedCount >= p.totalCount
    if (ui.participantFilter === 'suspicious') return false
    if (ui.participantFilter === 'error') return false
    return true
  })

  return (
    <ParticipantsTab
      filteredParticipants={filteredParticipants}
      participantFilter={ui.participantFilter}
      setParticipantFilter={ui.setParticipantFilter}
      setSelectedParticipant={setSelectedParticipant}
    />
  )
}
