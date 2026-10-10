"use client"

/** GET form that re-submits itself when a select or checkbox changes (text inputs still submit with Enter / the button). */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form
      className={className}
      onChange={(e) => {
        const t = e.target as HTMLInputElement | HTMLSelectElement
        if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "checkbox") e.currentTarget.requestSubmit()
      }}
    >
      {children}
    </form>
  )
}
