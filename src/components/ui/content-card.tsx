import { cn } from "@/lib/utils"

export default function ContentCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex h-full flex-col p-3.5">
      <div
        data-slot="content-card"
        className={cn(
          "floating-card-surface flex size-full flex-col overflow-hidden bg-card text-card-foreground ring-1 ring-sidebar-border",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
