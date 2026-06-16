export default function BackupPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Backup & Restore</h1>
      <p className="text-muted-foreground mb-6">Manage database backups and restore points.</p>
      <div className="rounded-lg border overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Backup</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Size</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "auto-daily-2026-06-15", date: "2026-06-15 03:00", size: "45 MB" },
              { name: "auto-daily-2026-06-14", date: "2026-06-14 03:00", size: "44 MB" },
              { name: "manual-pre-upgrade", date: "2026-06-12 14:30", size: "43 MB" },
            ].map((b) => (
              <tr key={b.name} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{b.name}</td>
                <td className="p-3 text-muted-foreground">{b.date}</td>
                <td className="p-3 text-muted-foreground">{b.size}</td>
                <td className="p-3 text-right text-muted-foreground text-xs">Restore | Download</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Backups are not yet active. Shown above is sample data for preview.</p>
    </div>
  )
}
