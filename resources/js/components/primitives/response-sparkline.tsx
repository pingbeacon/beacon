import type { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

export interface ResponseSparklineProps extends Omit<ComponentProps<"svg">, "points"> {
  points: number[]
  width?: number
  height?: number
  strokeWidth?: number
}

export function ResponseSparkline({
  points,
  width = 80,
  height = 20,
  strokeWidth = 1.25,
  className,
  ...props
}: ResponseSparklineProps) {
  if (points.length === 0) {
    return (
      <svg
        data-slot="response-sparkline"
        data-empty=""
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={twMerge("text-primary", className)}
        aria-hidden="true"
        {...props}
      />
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min
  const xStep = points.length > 1 ? width / (points.length - 1) : 0

  const coords = points.map((value, i) => {
    const x = i * xStep
    const y = range === 0 ? height / 2 : height - ((value - min) / range) * height
    return `${x},${y}`
  })

  return (
    <svg
      data-slot="response-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={twMerge("text-primary", className)}
      aria-hidden="true"
      {...props}
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
