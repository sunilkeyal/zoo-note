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
    <div className="w-full">
      <div
        className={cn(
          "px-4 sm:px-6 md:px-8 lg:px-10 pt-6 pb-4 sm:pb-6 w-full",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
