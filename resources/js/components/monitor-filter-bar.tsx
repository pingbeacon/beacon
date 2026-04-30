import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { TextField } from "@/components/ui/text-field"
import { Input, InputGroup } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"
import type { Tag } from "@/types/monitor"
import type { StatusFilterValue } from "@/hooks/use-monitor-filters"

interface MonitorFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilterValue
  onStatusFilterChange: (value: StatusFilterValue) => void
  tagFilter: number | null
  onTagFilterChange: (value: number | null) => void
  tags: Tag[]
}

const STATUS_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "up", label: "Up" },
  { id: "down", label: "Down" },
  { id: "paused", label: "Paused" },
  { id: "pending", label: "Pending" },
] as const

export default function MonitorFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  tags,
}: MonitorFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        aria-label="Search monitors"
        value={searchQuery}
        onChange={onSearchChange}
        className="min-w-[200px] flex-1"
      >
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" />
          <Input placeholder="Search monitors..." />
        </InputGroup>
      </TextField>

      <Select
        aria-label="Filter by status"
        selectedKey={statusFilter}
        onSelectionChange={(key) => onStatusFilterChange(key as StatusFilterValue)}
        className="w-40"
      >
        <SelectTrigger />
        <SelectContent items={STATUS_OPTIONS}>
          {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
        </SelectContent>
      </Select>

      {tags.length > 0 && (
        <Select
          aria-label="Filter by tag"
          selectedKey={tagFilter?.toString() ?? "all"}
          onSelectionChange={(key) => onTagFilterChange(key === "all" ? null : Number(key))}
          className="w-40"
        >
          <SelectTrigger />
          <SelectContent
            items={[
              { id: "all", name: "All tags" },
              ...tags.map((t) => ({ id: String(t.id), name: t.name })),
            ]}
          >
            {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
