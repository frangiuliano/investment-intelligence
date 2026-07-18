import { ArrowUpRight } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AreaPlaceholderProps = {
  areaCode: string
  title: string
  description: string
}

export function AreaPlaceholder({
  areaCode,
  title,
  description,
}: AreaPlaceholderProps) {
  return (
    <section>
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-ink/10 pb-6">
        <div>
          <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Research area / {areaCode}
          </p>
          <h1 className="font-heading text-4xl tracking-[-0.03em] sm:text-5xl">
            {title}
          </h1>
        </div>
        <p className="hidden max-w-sm text-right text-sm leading-6 text-muted-foreground md:block">
          {description}
        </p>
      </div>

      <Card className="min-h-64 justify-between border-dashed bg-paper/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Workspace reserved
            <ArrowUpRight className="size-4 text-signal" />
          </CardTitle>
          <CardDescription className="max-w-lg leading-6">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            Data integration follows in Issue #35
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
