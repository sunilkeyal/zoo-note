import { cn } from "@/lib/utils"

export default function ContentCard({
  children,
  className,
  capped = false,
}: {
  children: React.ReactNode
  className?: string
  // When true, cap the card to the editor toolbar width (~1142px) and left-align.
  capped?: boolean
}) {
  return (
    <div className="flex h-full flex-col p-2">
      <div
        data-slot="content-card"
        className={cn(
          "floating-card-surface flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground ring-1 ring-sidebar-border",
          capped && "max-w-[1142px]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
