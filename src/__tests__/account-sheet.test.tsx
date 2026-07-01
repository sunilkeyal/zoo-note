import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AccountSheet", () => {
  it("renders nothing when open=false", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const { container } = render(<AccountSheet open={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
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

  it("calls onClose when the overlay is clicked", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const onClose = vi.fn()
    render(<AccountSheet open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close account sheet overlay"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows validation error when name is cleared on submit", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    await userEvent.clear(nameInput)
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("Name is required.")).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("shows validation error when passwords don't match", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const inputs = screen.getAllByPlaceholderText(/password/i)
    await userEvent.type(inputs[0], "newpassword1")
    await userEvent.type(inputs[1], "differentpass")
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
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "New Name")
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
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "New Name")
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
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, "new@example.com")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }))
  })

  it("calls signOut when password is changed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["password"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const inputs = screen.getAllByPlaceholderText(/password/i)
    await userEvent.type(inputs[0], "newpassword1")
    await userEvent.type(inputs[1], "newpassword1")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }))
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
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, "taken@example.com")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument()
  })
})
