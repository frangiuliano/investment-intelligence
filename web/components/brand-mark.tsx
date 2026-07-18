export function BrandMark() {
  return (
    <div
      aria-hidden="true"
      className="relative grid size-9 place-items-center rounded-sm border border-current"
    >
      <span className="h-px w-5 bg-current" />
      <span className="absolute h-5 w-px bg-current" />
      <span className="absolute size-1.5 rounded-full bg-signal" />
    </div>
  )
}
