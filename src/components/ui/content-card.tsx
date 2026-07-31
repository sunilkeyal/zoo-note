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
          "flex size-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[0_10px_28px_rgba(15,23,42,0.10)] ring-1 ring-sidebar-border dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
