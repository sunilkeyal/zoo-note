import { LayoutDashboard } from "lucide-react"

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <LayoutDashboard className="size-5 text-violet-500 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Overview of system stats and activity</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-3xl font-bold">24</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Notes</p>
          <p className="text-3xl font-bold">1,482</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Active Today</p>
          <p className="text-3xl font-bold">8</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Storage Used</p>
          <p className="text-3xl font-bold">2.3 GB</p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Charts and detailed analytics will be shown here.
      </div>
    </div>
  )
}
