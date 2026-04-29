import { twMerge } from "tailwind-merge"

export interface EyebrowProps extends React.ComponentProps<"span"> {}

export function Eyebrow({ className, ...props }: EyebrowProps) {
  return <span data-slot="eyebrow" className={twMerge("eyebrow", className)} {...props} />
}
