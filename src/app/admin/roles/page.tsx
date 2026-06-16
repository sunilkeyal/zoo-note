export default function RolesPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Role Management</h1>
      <p className="text-muted-foreground mb-6">Define roles and assign permissions.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { name: "Admin", users: 1, perms: "Full access" },
          { name: "User", users: 18, perms: "Create and edit own notes" },
          { name: "Viewer", users: 5, perms: "Read-only access" },
        ].map((role) => (
          <div key={role.name} className="rounded-lg border p-4">
            <h3 className="font-semibold">{role.name}</h3>
            <p className="text-sm text-muted-foreground">{role.users} user(s)</p>
            <p className="text-xs text-muted-foreground mt-2">{role.perms}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Full role editor with granular permissions will be available soon.</p>
    </div>
  )
}
