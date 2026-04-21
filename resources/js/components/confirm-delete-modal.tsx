import { useState } from "react"
import { router } from "@inertiajs/react"
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

interface ConfirmDeleteModalProps {
  title: string
  description: string
  deleteUrl: string
  children: React.ReactNode
}

export default function ConfirmDeleteModal({
  title,
  description,
  deleteUrl,
  children,
}: ConfirmDeleteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleDelete = () => {
    setProcessing(true)
    router.delete(deleteUrl, {
      onSuccess: () => setIsOpen(false),
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={setIsOpen}>
      {children}
      <ModalContent role="alertdialog">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </ModalHeader>
        <ModalBody />
        <ModalFooter>
          <ModalClose>Cancel</ModalClose>
          <Button intent="danger" onPress={handleDelete} isDisabled={processing}>
            Delete
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
