type PageHeaderProps = {
  areaCode: string
  title: string
  description: string
  children?: React.ReactNode
}

export function PageHeader({
  areaCode,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-6">
      <div>
        <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          Research area / {areaCode}
        </p>
        <h1 className="font-heading text-4xl tracking-[-0.03em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}
