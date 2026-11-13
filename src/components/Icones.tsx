import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { tamanho?: number }

function Base({ tamanho = 24, children, ...p }: P) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  )
}

/** Painel: gráfico de barras */
export const IconePainel = (p: P) => (
  <Base {...p}>
    <path d="M3 21h18" />
    <rect x="4.5" y="12" width="3.5" height="6" rx="1" />
    <rect x="10.25" y="5" width="3.5" height="13" rx="1" />
    <rect x="16" y="9" width="3.5" height="9" rx="1" />
  </Base>
)

/** Produtos: bolo com vela */
export const IconeProdutos = (p: P) => (
  <Base {...p}>
    <path d="M3 21h18" />
    <path d="M5 21v-7.5A2.5 2.5 0 0 1 7.5 11h9a2.5 2.5 0 0 1 2.5 2.5V21" />
    <path d="M5 16c1.3 0 1.9-1.2 3.5-1.2S10.7 16 12 16s1.9-1.2 3.5-1.2S17.7 16 19 16" />
    <path d="M12 11V8" />
    <path d="M12 5.8c.9-.6.9-1.7 0-2.8-.9 1.1-.9 2.2 0 2.8Z" />
  </Base>
)

/** Compras: ler nota (cupom dentro da moldura de leitura) */
export const IconeLerNota = (p: P) => (
  <Base {...p}>
    <path d="M3 7.5V5a2 2 0 0 1 2-2h2.5" />
    <path d="M16.5 3H19a2 2 0 0 1 2 2v2.5" />
    <path d="M21 16.5V19a2 2 0 0 1-2 2h-2.5" />
    <path d="M7.5 21H5a2 2 0 0 1-2-2v-2.5" />
    <path d="M8 7h8v10.5l-1.4-.9-1.3.9-1.3-.9-1.3.9-1.3-.9-1.4.9Z" />
    <path d="M10.2 10h3.6M10.2 13h2.4" />
  </Base>
)

/** Vendas: sacola com cifrão */
export const IconeVendas = (p: P) => (
  <Base {...p}>
    <path d="M5.2 8h13.6l-1 11.6a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    <path d="M13.6 12.3c-.4-.5-1-.8-1.7-.8-.9 0-1.6.5-1.6 1.2 0 1.7 3.4.9 3.4 2.6 0 .7-.7 1.2-1.7 1.2-.7 0-1.4-.3-1.8-.9" />
    <path d="M12 10.6v.9M12 16.5v.9" />
  </Base>
)

/** Ajustes: controles deslizantes */
export const IconeAjustes = (p: P) => (
  <Base {...p}>
    <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M20 18h0" />
    <circle cx="16" cy="6" r="2.4" />
    <circle cx="10" cy="12" r="2.4" />
    <circle cx="17.5" cy="18" r="2.4" />
  </Base>
)

/** Marca: chapéu de cozinheira */
export const IconeMarca = (p: P) => (
  <Base {...p}>
    <path d="M7 17.5v-3.6A4 4 0 0 1 6.4 6.3 5.5 5.5 0 0 1 17.6 6.3a4 4 0 0 1-.6 7.6v3.6Z" />
    <path d="M7 17.5h10V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z" />
    <path d="M10 14v3.5M14 14v3.5" />
  </Base>
)
