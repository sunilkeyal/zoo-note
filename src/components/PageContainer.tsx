"use client"

import { cn } from "@/lib/utils"

export default function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div
        className={cn(
          "px-4 sm:px-6 md:px-8 lg:px-10 pt-2 pb-4 sm:pt-3 sm:pb-6 w-full md:max-w-[900px] lg:max-w-[1140px]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
