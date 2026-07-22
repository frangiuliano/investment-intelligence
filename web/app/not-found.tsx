import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Error 404
          </p>
          <CardTitle className="text-2xl">Página no encontrada</CardTitle>
          <CardDescription>
            El contenido que buscás no existe o ya no está disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/holdings" className={buttonVariants()}>
            Volver a la cartera
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
