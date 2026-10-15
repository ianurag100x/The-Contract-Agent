import { UsersTab } from '../../components/admin/tabs/UsersTab'
import { useAdmin } from '../../state/admin'
import { useAdminUI } from '../../state/AdminUIContext'

export default function AdminUsersPage() {
  const { users, setSelectedUser, suspendUser, restoreUser } = useAdmin()
  const ui = useAdminUI()

  const filteredUsers = users.filter((u) => {
    if (!ui.userSearch.trim()) return true
    return (
      u.name.toLowerCase().includes(ui.userSearch.toLowerCase()) ||
      String(u.tornId).includes(ui.userSearch)
    )
  })

  return (
    <UsersTab
      filteredUsers={filteredUsers}
      userSearch={ui.userSearch}
      setUserSearch={ui.setUserSearch}
      setSelectedUser={setSelectedUser}
      suspendUser={suspendUser}
      restoreUser={restoreUser}
    />
  )
}
