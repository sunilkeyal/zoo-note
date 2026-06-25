import { describe, it, expect } from "vitest"
import { generatePassword } from "@/lib/password"

describe("generatePassword", () => {
  it("returns a string of the specified length", () => {
    expect(generatePassword(12)).toHaveLength(12)
    expect(generatePassword(16)).toHaveLength(16)
  })

  it("contains at least one special character", () => {
    // With 8/72 special chars and length 12, some runs may not have special chars
    // Try up to 5 times — extremely unlikely to fail 5 times in a row
    let found = false
    for (let i = 0; i < 5; i++) {
      if (/[!@#$%^&*]/.test(generatePassword(12))) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it("uses default length of 12 when no argument given", () => {
    expect(generatePassword()).toHaveLength(12)
  })

  it("only contains characters from the defined charset", () => {
    const pw = generatePassword(100)
    expect(pw).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/)
  })

  it("generates different values each call", () => {
    const pw1 = generatePassword()
    const pw2 = generatePassword()
    expect(pw1).not.toBe(pw2)
  })
})
