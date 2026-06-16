export default function AuditPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Audit Logs</h1>
      <p className="text-muted-foreground mb-6">View user activity and system events.</p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Time</th>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {[
              { time: "14:32:15", user: "Alice", action: "Deleted note", detail: "Meeting Notes - Q2 Review" },
              { time: "14:28:03", user: "Bob", action: "Updated note", detail: "Project Status Report" },
              { time: "14:15:44", user: "Alice", action: "Created folder", detail: "Archive" },
              { time: "13:58:22", user: "Charlie", action: "Logged in", detail: "From Chrome on Windows" },
              { time: "13:45:09", user: "System", action: "Daily backup", detail: "Completed successfully" },
            ].map((entry, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3 text-muted-foreground text-xs font-mono">{entry.time}</td>
                <td className="p-3">{entry.user}</td>
                <td className="p-3">{entry.action}</td>
                <td className="p-3 text-muted-foreground">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Showing sample data. Live audit logging will be available soon.</p>
    </div>
  )
}
