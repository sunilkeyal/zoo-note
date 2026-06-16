export default function DashboardPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Overview of system stats and activity.</p>
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
