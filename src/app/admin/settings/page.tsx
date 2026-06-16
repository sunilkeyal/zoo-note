export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">System Settings</h1>
      <p className="text-muted-foreground mb-6">Configure application-wide settings.</p>
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-1">Application Name</h3>
          <p className="text-sm text-muted-foreground mb-2">The name displayed throughout the app.</p>
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">Notes App</div>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-1">Default Note Visibility</h3>
          <p className="text-sm text-muted-foreground mb-2">Default privacy setting for new notes.</p>
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">Private</div>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-1">Max Upload Size</h3>
          <p className="text-sm text-muted-foreground mb-2">Maximum file size for note attachments.</p>
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">10 MB</div>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-1">Session Timeout</h3>
          <p className="text-sm text-muted-foreground mb-2">Automatically log out inactive users after.</p>
          <div className="rounded border px-3 py-2 text-sm bg-muted/30 w-full max-w-xs">24 hours</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-6">Settings are not yet functional. Editable controls will be available soon.</p>
    </div>
  )
}
