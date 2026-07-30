import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render as rtlRender, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react"
import React from "react"

const mockUpdate = vi.fn()
const mockSignOut = vi.fn()

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: "Test User", email: "test@example.com" } },
    update: mockUpdate,
  })),
  signOut: mockSignOut,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

// The shadcn Base UI Drawer is a modal that registers module-level focus/scroll
// state when open. React Testing Library's cleanup unmounts an *open* drawer
// without running its close transition, leaving that state registered and
// breaking focus (and therefore typing) in subsequent tests. To avoid this, we
// track the active render and close the drawer (open=false) before unmounting.
let active: { result: ReturnType<typeof rtlRender>; element: React.ReactElement } | null = null
function render(ui: React.ReactElement) {
  const result = rtlRender(ui)
  active = { result, element: ui }
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  if (active) {
    const closed = React.cloneElement(active.element, { open: false } as { open: boolean })
    await act(async () => {
      active!.result.rerender(closed)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    active = null
  }
  cleanup()
})

describe("AccountSheet", () => {
  it("does not show the dialog when open=false", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={false} onClose={() => {}} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the sheet with prefilled name and email when open=true", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument()
  })

  it("calls onClose when Cancel is clicked", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const onClose = vi.fn()
    render(<AccountSheet open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when the X close button is clicked", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const onClose = vi.fn()
    render(<AccountSheet open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows validation error when name is cleared on submit", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    fireEvent.change(nameInput, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("Name is required.")).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("shows validation error when passwords don't match", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const inputs = screen.getAllByPlaceholderText(/password/i)
    fireEvent.change(inputs[0], { target: { value: "newpassword1" } })
    fireEvent.change(inputs[1], { target: { value: "differentpass" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls fetch with correct body on valid name-only submit", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["name"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    fireEvent.change(nameInput, { target: { value: "New Name" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/account",
      expect.objectContaining({ method: "PATCH" })
    ))
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.name).toBe("New Name")
  })

  it("calls update() and shows success message on name-only change", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["name"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    fireEvent.change(nameInput, { target: { value: "New Name" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ name: "New Name" }))
    expect(screen.getByText("Account updated.")).toBeInTheDocument()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it("calls signOut when email is changed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["email"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const emailInput = screen.getByDisplayValue("test@example.com")
    fireEvent.change(emailInput, { target: { value: "new@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    // signOut is deferred by a 500ms timeout in the component; allow extra time
    // so this stays reliable under parallel test load.
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }), { timeout: 3000 })
  })

  it("calls signOut when password is changed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["password"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/^new password/i), { target: { value: "newpassword1" } })
    fireEvent.change(screen.getByPlaceholderText(/repeat new password/i), { target: { value: "newpassword1" } })
    fireEvent.change(screen.getByPlaceholderText(/your current password/i), { target: { value: "oldpassword1" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    // signOut is deferred by a 500ms timeout in the component; allow extra time
    // so this stays reliable under parallel test load.
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }), { timeout: 3000 })
  })

  it("shows inline error when email is already taken (409)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "An account with this email already exists." }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const emailInput = screen.getByDisplayValue("test@example.com")
    fireEvent.change(emailInput, { target: { value: "taken@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument()
  })
})
