import { AnnouncementsTab } from '../../components/admin/tabs/SystemTabs'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminAnnouncementsPage() {
  const {
    announcements,
    activeAnnouncement,
    toggleAnnouncementActive,
    dismissActiveAnnouncement,
    deleteAnnouncement,
  } = useAdmin()

  const ui = useAdminUI()

  return (
    <AnnouncementsTab
      announcements={announcements}
      activeAnnouncement={activeAnnouncement}
      setShowAnnouncementModal={ui.setShowAnnouncementModal}
      toggleAnnouncementActive={toggleAnnouncementActive}
      dismissActiveAnnouncement={dismissActiveAnnouncement}
      deleteAnnouncement={deleteAnnouncement}
    />
  )
}
