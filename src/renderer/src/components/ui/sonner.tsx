import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

export const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
            "group toast group-[.toaster]:bg-theme-background group-[.toaster]:text-theme-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        description: "group-[.toast]:text-muted-foreground",
        actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      },
    }}
    {...props}
  />
)
