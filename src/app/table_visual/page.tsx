"use client"
import React, { useState } from "react"

const PADDING_OPTIONS = [
  { tag: "Very Tight",       value: "2px 6px",  desc: "2 top/bottom · 6 left/right" },
  { tag: "Tight (current)",  value: "3px 8px",  desc: "3 top/bottom · 8 left/right" },
  { tag: "Normal",           value: "4px 10px", desc: "4 top/bottom · 10 left/right" },
  { tag: "Comfortable",      value: "5px 12px", desc: "5 top/bottom · 12 left/right" },
  { tag: "Spacious",         value: "6px 14px", desc: "6 top/bottom · 14 left/right" },
]

const WIDTH_OPTIONS = [
  { tag: "Narrow",  value: 80  },
  { tag: "Compact", value: 100 },
  { tag: "Default (current)", value: 120 },
  { tag: "Wide",    value: 150 },
  { tag: "Large",   value: 180 },
]

const PREVIEW_ROWS = [
  ["Project",          "Status",       "Owner", "Due"],
  ["Design Review",    "In Progress",  "Alice", "Jul 15"],
  ["API Integration",  "Done",         "Bob",   "Jul 10"],
  ["Testing",          "Pending",      "Carol", "Jul 20"],
]

const MINI_ROWS = [["Alpha", "Beta"], ["Gamma", "Delta"]]

function swatch(selected: boolean) {
  return {
    cursor: "pointer" as const,
    border: `2px solid ${selected ? "#1a1a2e" : "#d1d5db"}`,
    borderRadius: "8px",
    padding: "12px 14px",
    background: selected ? "#f0f0f7" : "#fff",
    minWidth: "max-content",
    transition: "border-color 120ms",
  }
}

export default function TableVisualPage() {
  const [pad, setPad]     = useState("3px 8px")
  const [width, setWidth] = useState(120)

  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #d1d5db",
    padding: pad,
    width: `${width}px`,
    minWidth: `${width}px`,
    fontSize: "13px",
    fontFamily: "system-ui,-apple-system,sans-serif",
    boxSizing: "border-box",
    verticalAlign: "top",
    ...extra,
  })

  const header = (): React.CSSProperties => cell({
    background: "#f3f4f6",
    fontWeight: 600,
    textAlign: "left",
  })

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", padding: "32px 40px", maxWidth: "1200px", margin: "0 auto", color: "#1a1a2e" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Table Cell Size Preview</h1>
      <p style={{ color: "#6b7280", marginBottom: "36px", fontSize: "14px" }}>
        Click any option to see the live preview update. Current defaults are highlighted.
        <span style={{ marginLeft: "16px", fontFamily: "monospace", background: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", fontSize: "13px" }}>
          padding: {pad}
        </span>
        <span style={{ marginLeft: "8px", fontFamily: "monospace", background: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", fontSize: "13px" }}>
          col-width: {width}px
        </span>
      </p>

      {/* ── Live preview ── */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Live Preview</h2>
        <div style={{ display: "inline-block", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", background: "#fafafa", overflowX: "auto", maxWidth: "100%" }}>
          <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "auto" }}>
            <thead>
              <tr>
                {PREVIEW_ROWS[0].map((h, i) => <th key={i} style={header()}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {PREVIEW_ROWS.slice(1).map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => <td key={ci} style={cell()}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Padding options ── */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px" }}>Padding Options</h2>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {PADDING_OPTIONS.map((opt) => (
            <div key={opt.value} onClick={() => setPad(opt.value)} style={swatch(pad === opt.value)}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>{opt.tag}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>{opt.desc}</div>
              <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                  {MINI_ROWS.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => (
                        <td key={ci} style={{ border: "1px solid #d1d5db", padding: opt.value, width: "72px", fontSize: "12px", fontFamily: "system-ui,sans-serif", boxSizing: "border-box" }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* ── Column width options ── */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px" }}>Column Width Options</h2>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {WIDTH_OPTIONS.map((opt) => (
            <div key={opt.value} onClick={() => setWidth(opt.value)} style={swatch(width === opt.value)}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>{opt.tag}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>{opt.value}px per column</div>
              <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                <tbody>
                  {MINI_ROWS.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => (
                        <td key={ci} style={{ border: "1px solid #d1d5db", padding: "3px 8px", width: `${opt.value}px`, fontSize: "12px", fontFamily: "system-ui,sans-serif", boxSizing: "border-box" }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* ── All combinations ── */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "14px" }}>All Combinations at a Glance</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #e5e7eb", textAlign: "left" }}>Padding \ Width</th>
                {WIDTH_OPTIONS.map(w => (
                  <th key={w.value} style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #e5e7eb", textAlign: "center", whiteSpace: "nowrap" }}>
                    {w.tag}<br /><span style={{ fontWeight: 400, color: "#6b7280" }}>{w.value}px</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PADDING_OPTIONS.map((p) => (
                <tr key={p.value}>
                  <td style={{ padding: "6px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {p.tag}<br /><span style={{ fontWeight: 400, color: "#6b7280", fontFamily: "monospace", fontSize: "11px" }}>{p.value}</span>
                  </td>
                  {WIDTH_OPTIONS.map((w) => {
                    const isCurrent = p.value === "3px 8px" && w.value === 120
                    const isSelected = p.value === pad && w.value === width
                    return (
                      <td
                        key={w.value}
                        onClick={() => { setPad(p.value); setWidth(w.value) }}
                        style={{
                          padding: "8px",
                          border: "1px solid #e5e7eb",
                          cursor: "pointer",
                          background: isSelected ? "#f0f0f7" : isCurrent ? "#fefce8" : "#fff",
                          outline: isSelected ? "2px solid #1a1a2e" : "none",
                          transition: "background 120ms",
                        }}
                      >
                        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", margin: "0 auto" }}>
                          <tbody>
                            {MINI_ROWS.map((row, ri) => (
                              <tr key={ri}>
                                {row.map((c, ci) => (
                                  <td key={ci} style={{
                                    border: "1px solid #d1d5db",
                                    padding: p.value,
                                    width: `${w.value}px`,
                                    fontSize: "11px",
                                    fontFamily: "system-ui,sans-serif",
                                    boxSizing: "border-box",
                                  }}>{c}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {isCurrent && <div style={{ fontSize: "10px", color: "#92400e", textAlign: "center", marginTop: "4px" }}>current</div>}
                        {isSelected && !isCurrent && <div style={{ fontSize: "10px", color: "#1a1a2e", textAlign: "center", marginTop: "4px" }}>selected</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
