import { useEffect, useState } from 'react'

type UserProfile = {
  id: string
  email: string
  name: string | null
}

interface UserSelectorProps {
  onSelect: (userId: string | null) => void
  selectedUserId?: string | null
  currentUserId: string
}

export default function UserSelector({ onSelect, selectedUserId, currentUserId }: Readonly<UserSelectorProps>) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        // Fetch users from our API endpoint
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        const data = await response.json()
        
        // Filter out current user and format the data
        const formattedUsers = data.users
          .filter((user: UserProfile) => user.id !== currentUserId)
          .map((user: UserProfile) => ({
            id: user.id,
            email: user.email,
            name: user.name
          }))

        setUsers(formattedUsers)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [currentUserId])

  return (
    <div className="flex items-center mb-2">
      <label htmlFor="user-select" className="block mr-2 text-sm font-medium">
        Assign to:
      </label>
      <select
        id="user-select"
        className="rounded p-2 border border-gray-300 flex-grow"
        value={selectedUserId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        disabled={loading || users.length === 0}
      >
        <option value="">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name ?? user.email}
          </option>
        ))}
      </select>
      {loading && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
      {!loading && users.length === 0 && (
        <span className="ml-2 text-sm text-gray-500">No users available</span>
      )}
    </div>
  )
}
