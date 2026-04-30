import { PauseIcon, PlayIcon, TrashIcon, XMarkIcon } from "@heroicons/react/20/solid"
import { router } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal"

interface BulkActionToolbarProps {
  selectedIds: number[]
  onClear: () => void
}

export default function BulkActionToolbar({ selectedIds, onClear }: BulkActionToolbarProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const count = selectedIds.length
  const isVisible = count > 0
  const [shouldRender, setShouldRender] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (isVisible) {
      setShouldRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true)
        })
      })
    } else {
      setAnimateIn(false)
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false)
      }, 300)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible])

  const handleBulkAction = (action: "pause" | "resume" | "delete") => {
    setProcessing(true)
    router.post(
      `/monitors/bulk/${action}`,
      { monitor_ids: selectedIds },
      {
        onSuccess: () => {
          onClear()
          setDeleteModalOpen(false)
        },
        onFinish: () => setProcessing(false),
      },
    )
  }

  if (!shouldRender) return null

  return createPortal(
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6 transition-all duration-300 ease-out ${
        animateIn ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="flex items-center gap-3 rounded-xl border bg-background px-5 py-3 shadow-2xl"
      >
        <span className="font-medium text-sm tabular-nums" aria-live="polite" aria-atomic="true">
          {count} monitor{count > 1 ? "s" : ""} selected
        </span>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Button
            intent="outline"
            size="sm"
            onPress={() => handleBulkAction("pause")}
            isDisabled={processing}
          >
            <PauseIcon data-slot="icon" />
            Pause
          </Button>
          <Button
            intent="outline"
            size="sm"
            onPress={() => handleBulkAction("resume")}
            isDisabled={processing}
          >
            <PlayIcon data-slot="icon" />
            Resume
          </Button>
          <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <Button intent="danger" size="sm">
              <TrashIcon data-slot="icon" />
              Delete
            </Button>
            <ModalContent role="alertdialog">
              <ModalHeader>
                <ModalTitle>
                  Delete {count} Monitor{count > 1 ? "s" : ""}
                </ModalTitle>
                <ModalDescription>
                  Are you sure you want to delete {count} monitor{count > 1 ? "s" : ""}? They will
                  be archived and can be restored later.
                </ModalDescription>
              </ModalHeader>
              <ModalBody />
              <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button
                  intent="danger"
                  onPress={() => handleBulkAction("delete")}
                  isDisabled={processing}
                >
                  Delete
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
        <div className="h-5 w-px bg-border" />
        <Button intent="outline" size="sm" onPress={onClear}>
          <XMarkIcon data-slot="icon" />
          Clear
        </Button>
      </div>
    </div>,
    document.body,
  )
}
