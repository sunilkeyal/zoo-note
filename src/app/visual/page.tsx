"use client"

import React, { useState } from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const TOTAL = 47
const LIMIT = 10
const TOTAL_PAGES = Math.ceil(TOTAL / LIMIT)

function PageNumbers({ current, onPage }: { current: number; onPage: (p: number) => void }) {
  return (
    <>
      {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((p) => (
        <PaginationItem key={p}>
          <PaginationLink isActive={p === current} onClick={() => onPage(p)}>
            {p}
          </PaginationLink>
        </PaginationItem>
      ))}
    </>
  )
}

function OptionA() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option A — Spread: rows left, page info center, pagination right</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text=""
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                text=""
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

function OptionB() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option B — Compact bar: all in one row, info between controls</p>
      <div className="flex items-center justify-between rounded-lg border p-2 px-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground/70">|</span>
          <span>
            Page {safePage} of {totalPages} ({TOTAL} total)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === safePage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function OptionC() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option C — Pagination centered, info + rows below in a separate row</p>
      <div className="rounded-lg border p-3 space-y-3">
        <Pagination className="w-auto mx-0 justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-2">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span>Page {safePage} of {totalPages} ({TOTAL} total)</span>
        </div>
      </div>
    </div>
  )
}

function OptionD() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option D — Info on left, rows dropdown center, pagination on right</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Rows:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text=""
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                text=""
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

function OptionE() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option E — C in one row: rows left, info center, pagination right (with labels)</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Rows per page:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

function OptionF() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option F — rows left, pagination center, info right</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Rows:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text=""
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                text=""
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
      </div>
    </div>
  )
}

function OptionG() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option G — rows left, pagination (with labels) center, info right</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Rows:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
      </div>
    </div>
  )
}

function OptionH() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const totalPages = Math.ceil(TOTAL / limit)
  const safePage = Math.min(page, totalPages)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-mono">Option H — same as G but all elements same weight (no muted)</p>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline">Rows:</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PageNumbers current={safePage} onPage={setPage} />
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className={safePage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm">
          Page {safePage} of {totalPages} ({TOTAL} total)
        </span>
      </div>
    </div>
  )
}

export default function VisualPage() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Pagination Visual Comparison</h1>
        <p className="text-sm text-muted-foreground">
          47 items · Each option is interactive — click pages, change rows per page.
        </p>
      </div>

      <div className="space-y-8">
        <OptionA />
        <OptionB />
        <OptionC />
        <OptionD />
        <OptionE />
        <OptionF />
        <OptionG />
        <OptionH />
      </div>
    </div>
  )
}
