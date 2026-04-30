import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/20/solid"
import { router } from "@inertiajs/react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"

interface ImportExportSectionProps {
  selectedIds?: number[]
}

export default function ImportExportSection({ selectedIds = [] }: ImportExportSectionProps) {
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const params =
      selectedIds.length > 0 ? `?${selectedIds.map((id) => `ids[]=${id}`).join("&")}` : ""
    window.location.href = `/monitors/export${params}`
  }

  const handleImport = () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append("file", file)

    router.post("/monitors/import", formData as any, {
      forceFormData: true,
      onSuccess: () => {
        setImportModalOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
      onFinish: () => setImporting(false),
    })
  }

  return (
    <>
      <ButtonGroup>
        <Button intent="outline" size="sm" onPress={handleExport}>
          <ArrowDownTrayIcon data-slot="icon" />
          {selectedIds.length > 0 ? `Export (${selectedIds.length})` : "Export"}
        </Button>
        <Modal isOpen={importModalOpen} onOpenChange={setImportModalOpen}>
          <Button intent="outline" size="sm">
            <ArrowUpTrayIcon data-slot="icon" />
            Import
          </Button>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Import Monitors</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p className="mb-4 text-muted-foreground text-sm">
                Upload a JSON file previously exported from this application. Notification channels
                will not be imported.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-primary-foreground file:text-sm hover:file:bg-primary/90"
              />
            </ModalBody>
            <ModalFooter>
              <ModalClose>Cancel</ModalClose>
              <Button onPress={handleImport} isDisabled={importing}>
                Import
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </ButtonGroup>
    </>
  )
}
