"use client"

export default function ImportVisual() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-start justify-center pt-12">
      {/* Mockup phone/tablet frame */}
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            ImportExportSheet Mockup
          </h1>
          <p className="text-sm text-gray-500">Current layout + OneNote import section</p>
        </div>

        {/* Sheet mockup */}
        <div className="rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Import / Export</h2>
            <button
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="px-4 py-4 flex flex-col gap-6">
            {/* ─── Existing Export Section ─── */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Export</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Download a ZIP with all your notes, folders, and images.
              </p>
              <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                Export All Notes
              </button>
            </div>

            {/* ─── Existing ZIP Import Section ─── */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import from ZIP</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Select a previously exported ZIP file.
              </p>
              <button className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                Import Notes
              </button>
            </div>

            {/* ─── NEW: OneNote Import Section ─── */}
            <div className="rounded-lg border-2 border-purple-400 dark:border-purple-500 p-4 bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Import from OneNote
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Import a OneNote notebook (.onepkg) or section (.one). Folders and notes will be created automatically.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  Select File
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Accepted formats: <strong>.onepkg</strong>, <strong>.one</strong></span>
              </div>

              <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Best compatibility with <strong>OneNote 2016+ on Windows</strong>. Older versions and Mac exports may not work.</span>
              </div>

              {/* Example success state */}
              <div className="mt-3 flex items-start gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md p-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Imported 3 folders, 15 notes, 8 images.</span>
              </div>

              {/* Example error state */}
              <div className="mt-2 flex items-start gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md p-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Unsupported file format. Accepted: .onepkg, .one</span>
              </div>
            </div>

            {/* Legend */}
            <div className="text-center text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
              <span className="inline-block w-3 h-3 rounded border-2 border-purple-400 bg-purple-50/50 align-middle mr-1" />
              <span className="align-middle">Highlighted border = new OneNote section</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
