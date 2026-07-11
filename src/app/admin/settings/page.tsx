"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Settings, Lock, Save, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type SettingsData = Record<string, string>

const EDITABLE_SECTIONS = [
  {
    title: "General",
    description: "Application-wide display settings",
    settings: [
      { key: "app_name", label: "App Name", type: "text" },
      { key: "note_visibility", label: "Default Note Visibility", type: "select", options: ["private", "public"] },
    ],
  },
  {
    title: "Security",
    description: "Authentication and session settings",
    settings: [
      { key: "session_timeout_hours", label: "Session Timeout (hours)", type: "number" },
      { key: "allow_signup", label: "Allow New Signups", type: "toggle" },
    ],
  },
  {
    title: "Uploads",
    description: "File upload limits",
    settings: [
      { key: "max_upload_size_mb", label: "Max Upload Size (MB)", type: "number" },
    ],
  },
]

const ENV_SETTINGS = [
  { key: "storage_provider", label: "Storage Provider" },
  { key: "r2_bucket_name", label: "R2 Bucket Name" },
  { key: "r2_account_id", label: "R2 Account ID" },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edits, setEdits] = useState<SettingsData>({})
  const [isDirty, setIsDirty] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings")
      const body = await res.json()
      if (body.success) {
        setSettings(body.data)
        setEdits({})
        setIsDirty(false)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      })
      const body = await res.json()
      if (body.success) {
        setSettings((prev) => ({ ...prev, ...edits }))
        setEdits({})
        setIsDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function getValue(key: string): string {
    return edits[key] ?? settings[key] ?? ""
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center shrink-0">
            <Settings className="size-5 text-slate-700 dark:text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-xs text-muted-foreground">Configure application-wide settings</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center shrink-0">
            <Settings className="size-5 text-slate-700 dark:text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-xs text-muted-foreground">Configure application-wide settings</p>
          </div>
        </div>
        {isDirty && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {EDITABLE_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              {section.settings.map((s) => (
                <div key={s.key} className="space-y-1">
                  <Label className="text-xs">{s.label}</Label>
                  {s.type === "toggle" ? (
                    <Switch
                      checked={getValue(s.key) === "true"}
                      onCheckedChange={(checked) => handleChange(s.key, checked ? "true" : "false")}
                    />
                  ) : s.type === "select" ? (
                    <select
                      className="w-full max-w-xs rounded border px-3 py-2 text-sm bg-background"
                      value={getValue(s.key)}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    >
                      {s.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={s.type}
                      className="max-w-xs"
                      value={getValue(s.key)}
                      onChange={(e) => handleChange(s.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Env-controlled (read-only) settings */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold">Storage</h3>
              <p className="text-xs text-muted-foreground">Environment-controlled settings (read-only)</p>
            </div>
            {ENV_SETTINGS.map((s) => (
              <div key={s.key} className="space-y-1">
                <Label className="text-xs">{s.label}</Label>
                <div className="flex items-center gap-2">
                  <div className="rounded border px-3 py-2 text-sm bg-muted/30 max-w-xs">
                    {settings[s.key] || "(not set)"}
                  </div>
                  <Lock className="size-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
