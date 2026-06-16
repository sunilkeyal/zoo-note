export default function ImportExportPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Import / Export</h1>
      <p className="text-muted-foreground mb-6">Bulk export notes to Markdown/JSON; import from external sources.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Export</h3>
          <p className="text-sm text-muted-foreground mb-4">Download all notes in your preferred format.</p>
          <div className="flex gap-2">
            <div className="rounded border border-dashed px-4 py-2 text-sm text-muted-foreground">Export as Markdown</div>
            <div className="rounded border border-dashed px-4 py-2 text-sm text-muted-foreground">Export as JSON</div>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-2">Import</h3>
          <p className="text-sm text-muted-foreground mb-4">Import notes from external sources.</p>
          <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
            Drop files here or click to browse
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Full import/export functionality will be available soon.</p>
    </div>
  )
}
