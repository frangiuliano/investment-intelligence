import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-ink lg:grid-cols-[minmax(20rem,0.8fr)_minmax(34rem,1.2fr)]">
      <section className="relative flex min-h-72 flex-col justify-between border-b border-white/10 p-8 text-paper lg:min-h-screen lg:border-r lg:border-b-0 lg:p-12">
        <div className="research-grid absolute inset-0 opacity-30" />
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Investment Intelligence
            </p>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/45">
              Sistema privado de análisis
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-signal">
            Acceso del operador / 01
          </p>
          <h1 className="font-heading text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">
            Un espacio sereno para poner a prueba una tesis de inversión.
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-white/55">
            Revisá evidencia, seguí hipótesis y mantené cada decisión separada
            de la ejecución.
          </p>
        </div>

        <p className="relative hidden font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/35 lg:block">
          Operador único · Solo análisis · Sin ejecución de órdenes
        </p>
      </section>

      <section className="flex items-center justify-center bg-canvas px-6 py-16 sm:px-12">
        <Card className="w-full max-w-sm border-0 bg-transparent shadow-none ring-0">
          <CardHeader className="px-0">
            <p className="mb-8 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              Sesión segura
            </p>
            <CardTitle className="font-heading text-3xl tracking-tight">
              Abrí la mesa de análisis
            </CardTitle>
            <CardDescription className="pt-2 leading-6">
              Ingresá la contraseña del operador configurada para este entorno.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-4">
            <form action="/api/auth/login" method="post" className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña del operador</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  aria-invalid={error === "invalid"}
                  aria-describedby={error === "invalid" ? "login-error" : undefined}
                  className="h-11 bg-white"
                />
                {error === "invalid" ? (
                  <p id="login-error" className="text-sm text-destructive">
                    La contraseña es incorrecta o el acceso no está configurado.
                  </p>
                ) : null}
              </div>
              <Button type="submit" size="lg" className="h-11 w-full">
                Iniciar sesión segura
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
