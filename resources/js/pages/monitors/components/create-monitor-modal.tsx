import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@heroicons/react/20/solid"

interface CreateMonitorModalProps {
  children?: React.ReactNode
}

export default function CreateMonitorModal({ children }: CreateMonitorModalProps) {
  const navigate = () => router.visit("/monitors/create")

  if (children) {
    return (
      <div onClick={navigate} className="cursor-pointer">
        {children}
      </div>
    )
  }

  return (
    <Button onPress={navigate}>
      <PlusIcon data-slot="icon" />
      Add Monitor
    </Button>
  )
}
