export default function TrashPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Trash</h1>
      <p className="text-muted-foreground mb-6">View all deleted notes across users, batch restore or permanently delete.</p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Deleted By</th>
              <th className="text-left p-3 font-medium">Deleted At</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { title: "Meeting Notes - Q2 Review", user: "Alice", date: "2026-06-14" },
              { title: "Shopping List", user: "Bob", date: "2026-06-13" },
              { title: "Project Ideas Brainstorm", user: "Alice", date: "2026-06-12" },
              { title: "Old API Documentation", user: "Charlie", date: "2026-06-10" },
            ].map((item) => (
              <tr key={item.title} className="border-b last:border-0">
                <td className="p-3">{item.title}</td>
                <td className="p-3 text-muted-foreground">{item.user}</td>
                <td className="p-3 text-muted-foreground">{item.date}</td>
                <td className="p-3 text-right">
                  <span className="text-muted-foreground text-xs">Restore | Delete</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Showing sample data. Full trash management will be available soon.</p>
    </div>
  )
}
