import { useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { Input } from "@/components/ui/input"
import type { InputProps } from "react-aria-components"

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
        className="absolute end-0 top-0 flex h-full items-center px-2.5 text-muted-fg hover:text-fg transition-colors"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
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
