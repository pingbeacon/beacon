import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PageFooter } from "@/components/page-footer"

describe("PageFooter", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the beacon · self-hosted · MIT line", () => {
    render(<PageFooter />)
    expect(screen.getByText(/beacon · self-hosted · MIT/i)).toBeInTheDocument()
  })

  it("renders a last-sync slot", () => {
    render(<PageFooter lastSync="just now" />)
    expect(screen.getByText(/last sync · just now/i)).toBeInTheDocument()
  })
})
