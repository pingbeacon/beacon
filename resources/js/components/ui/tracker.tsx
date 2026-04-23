import { useState } from "react"
import { twJoin, twMerge } from "tailwind-merge"
import { Tooltip, TooltipContent } from "./tooltip"

interface TrackerBlockProps {
  key?: string | number
  color?: string
  tooltip?: string
  defaultBackgroundColor?: string
  disabledTooltip?: boolean
}

const Block = ({
  color,
  tooltip,
  disabledTooltip,
  defaultBackgroundColor = "bg-secondary",
}: TrackerBlockProps) => {
  const [open, setOpen] = useState(false)

  return disabledTooltip ? (
    <div className="size-full overflow-hidden px-[0.5px] transition hover:scale-y-[1.3] first:rounded-s-sm first:ps-0 last:rounded-e-sm last:pe-0 sm:px-px">
      <div
        className={twJoin(
          "size-full rounded-[1px] transition-[filter] duration-100",
          color || defaultBackgroundColor,
          "hover:brightness-125",
        )}
      />
    </div>
  ) : (
    <Tooltip isOpen={open} onOpenChange={setOpen} delay={0} closeDelay={0}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="size-full cursor-default overflow-hidden px-[0.5px] transition hover:scale-y-[1.3] first:rounded-s-sm first:ps-0 last:rounded-e-sm last:pe-0 sm:px-px"
      >
        <div
          className={twJoin(
            "size-full rounded-[1px] transition-[filter] duration-100",
            color || defaultBackgroundColor,
            "hover:brightness-125",
          )}
        />
      </button>
      <TooltipContent
        arrow={false}
        offset={10}
        placement="top"
        inverse
        className="px-2 py-1.5 text-xs"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

interface TrackerProps
  extends React.ComponentProps<"div">,
    Pick<TrackerBlockProps, "disabledTooltip"> {
  data: TrackerBlockProps[]
  defaultBackgroundColor?: string
}

const Tracker = ({
  data = [],
  disabledTooltip = false,
  className,
  ref,
  ...props
}: TrackerProps) => {
  return (
    <div ref={ref} className={twMerge("group flex h-8 w-full items-center", className)} {...props}>
      {data.map(({ key, ...rest }, index) => (
        <Block disabledTooltip={disabledTooltip} key={key ?? index} {...rest} />
      ))}
    </div>
  )
}

export { Tracker, type TrackerBlockProps }
