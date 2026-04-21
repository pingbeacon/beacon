import { tagTextColor } from "@/lib/color"
import type { Tag } from "@/types/monitor"

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: tag.color, color: tagTextColor(tag.color) }}
    >
      {tag.name}
    </span>
  )
}
