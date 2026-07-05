import { Star, ArrowLeft } from "lucide-react"

const options = [
  {
    id: "remove",
    name: "No indicator",
    tagline: "Favorites only visible in sidebar",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate">Shopping List</span>
      </div>
    ),
  },
  {
    id: "right",
    name: "Star on the right",
    tagline: "Star icon after the title",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate flex-1">Shopping List</span>
        <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
      </div>
    ),
  },
  {
    id: "accent",
    name: "Left accent bar",
    tagline: "Colored bar on the left edge",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate">Shopping List</span>
      </div>
    ),
  },
  {
    id: "colored",
    name: "Colored title text",
    tagline: "Favorite title in amber, no icon",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate text-amber-600 dark:text-amber-400">Shopping List</span>
      </div>
    ),
  },
  {
    id: "tint",
    name: "Background tint",
    tagline: "Subtle amber background highlight",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate">Shopping List</span>
      </div>
    ),
  },
  {
    id: "far-right",
    name: "Star at row end",
    tagline: "Star pushed to the far right",
    note: (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="text-sm truncate flex-1">Shopping List</span>
        <div className="flex items-center justify-center size-5 rounded hover:bg-muted transition-colors">
          <Star className="size-3 text-amber-500 fill-amber-500" />
        </div>
      </div>
    ),
  },
]

export default function StarPage() {
  return (
    <div className="min-h-svh">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-2">Favorite Note Indicator — Options</h1>
          <p className="text-muted-foreground">
            Each row shows what a favorite note looks like in the sidebar list. Current position is left of the title (amber filled star).
          </p>
        </div>

        <div className="grid gap-6">
          {options.map((o) => (
            <section key={o.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {o.id === "remove" ? "—" : options.indexOf(o) + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold text-sm">{o.name}</h2>
                    <p className="text-xs text-muted-foreground">{o.tagline}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="rounded-lg border border-dashed border-border bg-background p-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border opacity-60">
                      <span className="size-2 rounded-full bg-sky-400" />
                      <span className="text-sm truncate">Work Notes</span>
                    </div>
                    {o.note}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border opacity-60">
                      <span className="size-2 rounded-full bg-violet-400" />
                      <span className="text-sm truncate">Recipes</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-card p-5">
          <h2 className="font-semibold text-sm mb-2">My recommendation</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Right-side star (#2)</strong> or <strong>left accent bar (#3)</strong> — both feel cleaner than the current left-side star.
            The accent bar is more subtle; right-side star is more discoverable as a toggle target.
          </p>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back to app
          </a>
        </div>
      </div>
    </div>
  )
}
