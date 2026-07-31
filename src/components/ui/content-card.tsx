import { cn } from "@/lib/utils"

export default function ContentCard({
  children,
  className,
  fill = false,
}: {
  children: React.ReactNode
  className?: string
  fill?: boolean
}) {
  return (
    <div className={cn("flex flex-col p-2", fill ? "h-full" : "min-h-full")}>
      <div
        data-slot="content-card"
        className={cn(
          "floating-card-surface flex w-full max-w-[1142px] flex-col bg-card text-card-foreground ring-1 ring-sidebar-border",
          fill ? "h-full overflow-hidden" : "min-h-full",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
