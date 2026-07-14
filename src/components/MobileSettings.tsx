"use client"

import React from "react"

interface MobileSettingsProps {
  currentTheme: string
  onBack: () => void
  onThemeChange: (theme: string) => void
}

export default function MobileSettings({ currentTheme, onBack, onThemeChange }: MobileSettingsProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Appearance</div>

        <div className="mb-4">
          <div className="text-sm font-semibold mb-2">Theme</div>
          <div className="flex gap-2">
            {["Light", "Dark", "System"].map((t) => (
              <div
                key={t}
                onClick={() => onThemeChange(t.toLowerCase())}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer border transition-colors ${
                  currentTheme === t.toLowerCase()
                    ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Editor</div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <div className="text-sm font-medium">Font Size</div>
            <div className="text-xs text-muted-foreground">14px</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <div className="text-sm font-medium">Spell Check</div>
            <div className="text-xs text-muted-foreground">Enabled</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
      </div>
    </div>
  )
}
