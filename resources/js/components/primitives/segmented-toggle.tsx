import type { ReactNode } from "react"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"

export interface SegmentedToggleOption<T extends string> {
  value: T
  label?: ReactNode
  icon?: ReactNode
  ariaLabel?: string
}

export interface SegmentedToggleProps<T extends string>
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: T
  onChange: (value: T) => void
  options: SegmentedToggleOption<T>[]
  size?: "sm" | "md"
}

const segmentStyles = tv({
  base: [
    "inline-flex items-center justify-center gap-1.5 border border-border text-muted-foreground transition-colors",
    "not-first:-ml-px first:rounded-l-md last:rounded-r-md",
    "hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
  ],
  variants: {
    size: {
      sm: "px-2.5 py-1 text-[11px]",
      md: "px-3 py-1.5 text-xs",
    },
    isSelected: {
      true: "z-10 border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
      false: "bg-transparent",
    },
  },
  defaultVariants: {
    size: "md",
    isSelected: false,
  },
})

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ...props
}: SegmentedToggleProps<T>) {
  return (
    <div
      data-slot="segmented-toggle"
      role="group"
      className={twMerge("inline-flex font-medium", className)}
      {...props}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={option.ariaLabel}
            data-slot="segmented-toggle-item"
            data-value={option.value}
            data-selected={isSelected ? "" : undefined}
            onClick={() => {
              if (!isSelected) {
                onChange(option.value)
              }
            }}
            className={segmentStyles({ size, isSelected })}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
