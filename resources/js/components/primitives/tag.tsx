import { twMerge } from "tailwind-merge"

export interface TagProps extends React.ComponentProps<"span"> {}

export function Tag({ className, ...props }: TagProps) {
  return <span data-slot="tag" className={twMerge("tag", className)} {...props} />
}
