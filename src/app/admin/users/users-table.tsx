"use client"

import { cn } from "@/lib/utils"
import React from "react"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination"
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
import { Pencil, Trash2, ArrowUp, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
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

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
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

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("displayName")}>
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "displayName" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("email")}>
                <div className="flex items-center gap-1">
                  Email
                  {sortField === "email" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("role")}>
                <div className="flex items-center gap-1">
                  Role
                  {sortField === "role" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("isActive")}>
                <div className="flex items-center gap-1">
                  Status
                  {sortField === "isActive" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSortChange("createdAt")}>
                <div className="flex items-center gap-1">
                  Created
                  {sortField === "createdAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full mb-2" />
                  ))}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isCurrentUser = currentUserId === u._id
                return (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">
                    {u.displayName}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pl-1.5! hover:text-muted-foreground", page <= 1 && "pointer-events-none opacity-50")}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:block">Previous</span>
              </Button>
            </PaginationItem>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <Button
                    variant={p === page ? "outline" : "ghost"}
                    size="icon"
                    className="h-8 w-8 hover:text-muted-foreground"
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pr-1.5! hover:text-muted-foreground", page >= totalPages && "pointer-events-none opacity-50")}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                aria-label="Go to next page"
              >
                <span className="hidden sm:block">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm">
          Page {page} of {totalPages} ({total} total)
        </span>
      </div>
    </div>
  )
}
