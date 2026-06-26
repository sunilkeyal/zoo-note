"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { Plus } from "lucide-react"
import UsersTable, { type UserRow } from "./users-table"
import CreateUserDialog from "./create-user-dialog"
import EditUserDialog from "./edit-user-dialog"
import DeleteUserDialog from "./delete-user-dialog"
import ResetPasswordDialog from "./reset-password-dialog"

export default function UsersPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
        setTotal(data.data.total)
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function handleSearchChange(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  async function handleToggleActive(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u))
        )
      }
    } catch (err) {
      console.error("Failed to toggle user status:", err)
    }
  }

  function handleUserCreated(user: any) {
    setUsers((prev) => [user, ...prev])
    setTotal((t) => t + 1)
  }

  function handleUserUpdated() {
    fetchUsers()
  }

  function handleUserDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u._id !== userId))
    setTotal((t) => t - 1)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, passwords, and access.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <UsersTable
        users={users}
        total={total}
        page={page}
        limit={limit}
        loading={loading}
        currentUserId={currentUserId}
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onRoleFilterChange={(v) => { setRoleFilter(v); setPage(1) }}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1) }}
        onPageChange={setPage}
        onLimitChange={(v) => { setLimit(v); setPage(1) }}
        onToggleActive={handleToggleActive}
        onEdit={setEditUser}
        onResetPassword={setResetPwUser}
        onDelete={setDeleteUser}
      />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleUserCreated}
      />

      <EditUserDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={handleUserUpdated}
      />

      <DeleteUserDialog
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={handleUserDeleted}
      />

      <ResetPasswordDialog
        open={!!resetPwUser}
        user={resetPwUser}
        onClose={() => setResetPwUser(null)}
      />
    </div>
  )
}
