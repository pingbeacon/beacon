import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import type { InputProps } from "react-aria-components"
import { Input } from "@/components/ui/input"

type PasswordInputProps = Omit<InputProps, "type">

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={`pe-9 sm:pe-8 ${className ?? ""}`.trim()}
        {...props}
      />
      <button
        type="button"
        className="touch-hitbox absolute end-0 top-0 flex h-full items-center px-2.5 text-muted-fg transition-colors hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeSlashIcon className="size-4" aria-hidden="true" />
        ) : (
          <EyeIcon className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
