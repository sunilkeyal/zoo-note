"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Trash2, ArrowUp } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface UserRow {
  _id: string
  email: string
  displayName: string
  role: "admin" | "user"
  isActive: boolean
  createdAt: string
}

interface Props {
  users: UserRow[]
  total: number
  page: number
  limit: number
  loading: boolean
  currentUserId?: string
  search: string
  roleFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onToggleActive: (user: UserRow) => void
  onEdit: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  sortField: string
  sortDir: "asc" | "desc"
  onSortChange: (field: string) => void
}

export default function UsersTable({
  users, total, page, limit, loading, currentUserId,
  search, roleFilter, statusFilter,
  onSearchChange, onRoleFilterChange, onStatusFilterChange,
  onPageChange, onLimitChange,
  onToggleActive, onEdit, onDelete,
  sortField, sortDir, onSortChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto md:overflow-x-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("displayName")}>
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "displayName" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("email")}>
                <div className="flex items-center gap-1">
                  Email
                  {sortField === "email" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("role")}>
                <div className="flex items-center gap-1">
                  Role
                  {sortField === "role" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("isActive")}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "isActive" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-left p-2 md:p-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("createdAt")}>
                <div className="flex items-center gap-1">
                  Created
                  {sortField === "createdAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </th>
              <th className="text-right p-2 md:p-3 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-2 md:p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full mb-2" />
                  ))}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 md:p-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isCurrentUser = currentUserId === u._id
                return (
                <tr key={u._id} className="border-b last:border-0 even:bg-muted/10">
                  <td className="p-2 md:p-3 font-medium">
                    {u.displayName}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-2 md:p-3">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                  <td className="p-2 md:p-3">
                    <div className="flex items-center gap-2">
                      {isCurrentUser ? (
                        <TooltipProvider delay={0}>
                          <Tooltip>
                            <TooltipTrigger render={<span className="flex items-center gap-2 cursor-not-allowed" />}>
                              <Switch checked={u.isActive} disabled />
                              <span className={u.isActive ? "text-green-600/50" : "text-red-600/50"}>
                                {u.isActive ? "Active" : "Disabled"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Cannot disable your own account</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch checked={u.isActive} onCheckedChange={() => onToggleActive(u)} />
                          <span className={u.isActive ? "text-green-600" : "text-red-600"}>
                            {u.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 md:p-3 text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 md:p-3 text-right">
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50" onClick={() => onEdit(u)} />}>
                            <Pencil className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>Edit user</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600 hover:bg-red-50 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:hover:text-red-600 disabled:hover:bg-red-50" disabled={isCurrentUser} onClick={() => onDelete(u)} />}>
                            <Trash2 className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>{isCurrentUser ? "Cannot delete yourself" : "Delete user"}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
