import { FileSearch, ArrowLeft } from "lucide-react"

const colors = [
  { name: "muted", circle: "bg-muted", icon: "text-muted-foreground" },
  { name: "primary", circle: "bg-primary/10", icon: "text-primary" },
  { name: "amber", circle: "bg-amber-100 dark:bg-amber-900/30", icon: "text-amber-500" },
  { name: "red", circle: "bg-destructive/10", icon: "text-destructive" },
  { name: "blue", circle: "bg-blue-100 dark:bg-blue-900/30", icon: "text-blue-500" },
  { name: "green", circle: "bg-emerald-100 dark:bg-emerald-900/30", icon: "text-emerald-500" },
  { name: "violet", circle: "bg-violet-100 dark:bg-violet-900/30", icon: "text-violet-500" },
  { name: "orange", circle: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-500" },
  { name: "teal", circle: "bg-teal-100 dark:bg-teal-900/30", icon: "text-teal-500" },
  { name: "pink", circle: "bg-pink-100 dark:bg-pink-900/30", icon: "text-pink-500" },
]

export default function NoteNotFoundVisualsPage() {
  return (
    <div className="min-h-svh">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-2">FileSearch Icon — Color Options</h1>
          <p className="text-muted-foreground">
            Same icon, different circle + icon color combinations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {colors.map(({ name, circle, icon }) => (
            <div key={name} className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4">
                <div className="rounded-lg border border-dashed border-border bg-background mb-3">
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className={`size-14 rounded-full ${circle} flex items-center justify-center mb-4`}>
                      <FileSearch className={`size-7 ${icon}`} />
                    </div>
                    <h3 className="text-sm font-semibold mb-0.5">Note not found</h3>
                    <p className="text-xs text-muted-foreground text-center">
                      The link you followed may be broken, or the note may have been removed.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center font-medium">{name}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back to app
          </a>
        </div>
      </div>
    </div>
  )
}
