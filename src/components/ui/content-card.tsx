import { cn } from "@/lib/utils"

export default function ContentCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex h-full flex-col p-2">
      <div
        data-slot="content-card"
        className={cn(
          "floating-card-surface flex h-full w-full max-w-[1142px] flex-col overflow-hidden bg-card text-card-foreground ring-1 ring-sidebar-border",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
