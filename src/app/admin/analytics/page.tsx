export default function AnalyticsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Activity / Analytics</h1>
      <p className="text-muted-foreground mb-6">Charts for notes created, active users, storage usage trends.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Notes Created (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-32 pt-4">
            {[40, 65, 35, 80, 55, 70, 45].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Active Users</h3>
          <p className="text-3xl font-bold">12</p>
          <p className="text-sm text-muted-foreground">past 7 days</p>
          <div className="mt-4 space-y-2">
            {[{ name: "Alice", notes: 45 }, { name: "Bob", notes: 32 }, { name: "Charlie", notes: 28 }, { name: "Diana", notes: 20 }].map((u) => (
              <div key={u.name} className="flex justify-between text-sm">
                <span>{u.name}</span>
                <span className="text-muted-foreground">{u.notes} notes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Full analytics with interactive charts will be available soon.</p>
    </div>
  )
}
