import { Head } from "@inertiajs/react"
import { useState } from "react"
import { PrimitivesGallery } from "@/components/primitives/__fixtures__/gallery"

export default function DevPrimitivesPage() {
  const [view, setView] = useState<"grid" | "list">("grid")
  return (
    <>
      <Head title="Primitives · dev" />
      <div className="min-h-screen bg-background">
        <header className="border-border border-b px-8 py-6">
          <span className="eyebrow block text-[11px] text-primary leading-none">dev fixture</span>
          <h1 className="mt-1.5 font-medium text-[26px] text-foreground tracking-[-0.02em]">
            Primitives
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Visual reference for the shared primitives shipped in #20.
          </p>
        </header>
        <PrimitivesGallery segmentedValue={view} onSegmentedChange={setView} />
      </div>
    </>
  )
}
