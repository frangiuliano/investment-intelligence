import {
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  ClipboardCheck,
  FlaskConical,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import { hasValidSession } from "@/lib/auth/server-session"

const navigation = [
  { href: "/holdings", label: "Cartera", icon: BriefcaseBusiness },
  { href: "/hypotheses", label: "Hipótesis", icon: FlaskConical },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/briefs", label: "Informes", icon: BookOpenText },
  { href: "/reviews", label: "Revisiones", icon: ClipboardCheck },
]

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await hasValidSession())) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/holdings"
            className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <BrandMark />
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Investment Intelligence
              </p>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                Mesa de análisis
              </p>
            </div>
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut data-icon="inline-start" />
              Cerrar sesión
            </Button>
          </form>
        </div>
        <nav
          aria-label="Áreas de análisis"
          className="mx-auto flex max-w-[96rem] gap-1 overflow-x-auto px-5 sm:px-8"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-w-fit items-center gap-2 border-b-2 border-transparent px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:border-ink/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[96rem] px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  )
}
