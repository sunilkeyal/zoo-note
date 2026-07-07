import { Database } from "lucide-react"

export default function BackupPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
          <Database className="size-5 text-teal-600 dark:text-teal-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Backup & Restore</h1>
          <p className="text-xs text-muted-foreground">Manage database backups and restore points</p>
        </div>
      </div>
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
