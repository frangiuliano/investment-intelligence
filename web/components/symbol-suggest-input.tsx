"use client"

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

import { Input } from "@/components/ui/input"
import {
  ASSET_SUGGEST_DEBOUNCE_MS,
  assetSuggestSrc,
  shouldFetchAssetSuggestions,
  shouldSelectSuggestionOnEnter,
} from "@/lib/api/asset-suggest"
import type { AssetSuggestion, AssetSuggestResult } from "@/lib/api/types"
import { cn } from "@/lib/utils"

type SymbolSuggestInputProps = {
  name?: string
  placeholder?: string
  required?: boolean
  className?: string
  "aria-label"?: string
}

type SuggestStatus = "idle" | "loading" | "ready" | "empty" | "error"

export function SymbolSuggestInput({
  name = "ticker",
  placeholder = "Símbolo o nombre, p. ej. AAPL",
  required = false,
  className,
  "aria-label": ariaLabel = "Símbolo o nombre del activo",
}: SymbolSuggestInputProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const skipNextFetchRef = useRef(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<AssetSuggestion[]>([])
  const [status, setStatus] = useState<SuggestStatus>("idle")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const fetchSuggestions = useEffectEvent(
    async (value: string, signal: AbortSignal) => {
      try {
        const response = await fetch(assetSuggestSrc(value), {
          method: "GET",
          cache: "no-store",
          signal,
        })

        if (signal.aborted) {
          return
        }

        if (!response.ok) {
          setItems([])
          setStatus("error")
          setActiveIndex(-1)
          return
        }

        const body = (await response.json()) as AssetSuggestResult
        if (signal.aborted) {
          return
        }

        const nextItems = Array.isArray(body.items) ? body.items : []
        setItems(nextItems)
        setStatus(nextItems.length === 0 ? "empty" : "ready")
        // Leave highlight unset so Enter submits the typed ticker unless the
        // operator navigates with arrows or hover.
        setActiveIndex(-1)
        setOpen(true)
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          return
        }
        setItems([])
        setStatus("error")
        setActiveIndex(-1)
      }
    }
  )

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }

    if (!shouldFetchAssetSuggestions(query)) {
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      void fetchSuggestions(query, controller.signal)
    }, ASSET_SUGGEST_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function resetSuggestionsForTypedQuery(value: string) {
    if (!shouldFetchAssetSuggestions(value)) {
      setItems([])
      setStatus("idle")
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    // Drop previous results immediately so debounce never shows/selects stale
    // suggestions for another query.
    setItems([])
    setActiveIndex(-1)
    setStatus("loading")
    setOpen(true)
  }

  function selectSuggestion(item: AssetSuggestion) {
    skipNextFetchRef.current = true
    setQuery(item.symbol)
    setItems([])
    setStatus("idle")
    setOpen(false)
    setActiveIndex(-1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "ArrowDown" && status === "ready" && items.length > 0) {
        event.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (status !== "ready" || items.length === 0) {
        return
      }
      setActiveIndex((current) =>
        current < items.length - 1 ? current + 1 : 0
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (status !== "ready" || items.length === 0) {
        return
      }
      setActiveIndex((current) =>
        current <= 0 ? items.length - 1 : current - 1
      )
      return
    }

    // Enter selects only after explicit highlight (arrows/hover). Otherwise
    // the form submits the typed symbol. Never select while loading/stale.
    if (
      event.key === "Enter" &&
      shouldSelectSuggestionOnEnter(status, activeIndex, items.length) &&
      items[activeIndex]
    ) {
      event.preventDefault()
      selectSuggestion(items[activeIndex])
    }
  }

  const showPanel =
    open &&
    shouldFetchAssetSuggestions(query) &&
    (status === "loading" ||
      status === "ready" ||
      status === "empty" ||
      status === "error")

  const activeOptionId =
    status === "ready" && activeIndex >= 0 && items[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined

  return (
    <div ref={rootRef} className="relative w-64">
      <Input
        name={name}
        value={query}
        onChange={(event) => {
          const value = event.target.value
          setQuery(value)
          resetSuggestionsForTypedQuery(value)
        }}
        onFocus={() => {
          if (shouldFetchAssetSuggestions(query)) {
            setOpen(true)
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        className={cn("font-mono tracking-wide", className)}
      />

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Sugerencias de activos"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-sm"
        >
          {status === "loading" ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Buscando…
            </p>
          ) : null}

          {status === "empty" ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Sin resultados. Escribí el símbolo exacto si lo conocés; no se
              inventa un ticker.
            </p>
          ) : null}

          {status === "error" ? (
            <p className="px-2.5 py-2 text-xs text-destructive" role="alert">
              No se pudieron cargar sugerencias. Podés escribir el símbolo a
              mano.
            </p>
          ) : null}

          {status === "ready"
            ? items.map((item, index) => {
                const selected = index === activeIndex
                return (
                  <button
                    key={`${item.symbol}-${item.exchange ?? "na"}-${index}`}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-start gap-2 px-2.5 py-1.5 text-left transition-colors",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/70"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(item)}
                  >
                    <span className="font-mono text-xs font-semibold tracking-wide">
                      {item.symbol}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {item.name}
                      {item.exchange ? ` · ${item.exchange}` : ""}
                    </span>
                    {item.prioritized ? (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-signal">
                        cartera
                      </span>
                    ) : null}
                  </button>
                )
              })
            : null}
        </div>
      ) : null}
    </div>
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}
