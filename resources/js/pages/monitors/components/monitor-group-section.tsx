import { useState } from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from "@heroicons/react/20/solid"
import type { MonitorGroup } from "@/types/monitor"
import MonitorGroupModal from "./monitor-group-modal"
import ConfirmDeleteModal from "@/components/confirm-delete-modal"

interface MonitorGroupSectionProps {
  group: MonitorGroup
  children: React.ReactNode
  monitorCount: number
}

export default function MonitorGroupSection({ group, children, monitorCount }: MonitorGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed)

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRightIcon className="size-5" />
          ) : (
            <ChevronDownIcon className="size-5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{group.name}</span>
          <span className="ml-2 text-muted-foreground text-xs">({monitorCount})</span>
          {group.description && (
            <p className="truncate text-muted-foreground text-xs">{group.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <MonitorGroupModal group={group}>
            <Button intent="outline" size="sm" className="size-8 p-0">
              <PencilIcon className="size-3.5" />
            </Button>
          </MonitorGroupModal>
          <ConfirmDeleteModal
            title="Delete Group"
            description="Are you sure? Monitors in this group will be ungrouped, not deleted."
            deleteUrl={`/monitor-groups/${group.id}`}
          >
            <Button intent="outline" size="sm" className="size-8 p-0">
              <TrashIcon className="size-3.5" />
            </Button>
          </ConfirmDeleteModal>
        </div>
      </div>
      {!collapsed && <div className="space-y-2 px-4 pb-4">{children}</div>}
    </div>
  )
}
