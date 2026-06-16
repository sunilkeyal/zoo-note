export default function UsersPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">User Management</h1>
      <p className="text-muted-foreground mb-6">Manage user accounts, passwords, and access.</p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Alice Admin", email: "alice@example.com", role: "admin" },
              { name: "Bob Builder", email: "bob@example.com", role: "user" },
              { name: "Charlie Contributor", email: "charlie@example.com", role: "user" },
              { name: "Diana Viewer", email: "diana@example.com", role: "user" },
            ].map((u) => (
              <tr key={u.email} className="border-b last:border-0">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{u.role}</span></td>
                <td className="p-3 text-right text-muted-foreground text-xs">Edit | Disable</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Showing sample data. Full user management will be available soon.</p>
    </div>
  )
}
