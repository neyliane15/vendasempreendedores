import type { ComponentType } from 'react'
import { modoDemo } from '../lib/supabase'
import { IconeAjustes, IconeLerNota, IconeMarca, IconePainel, IconeProdutos, IconeVendas } from './Icones'

export type Aba = 'painel' | 'produtos' | 'escanear' | 'vendas' | 'ajustes'

export function Topo({ nome }: { nome: string }) {
  return (
    <header className="topo">
      <div className="topo-linha">
        <div className="topo-logo"><IconeMarca tamanho={24} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <small>Sabor &amp; Lucro{modoDemo ? ' · demonstração' : ''}</small>
          <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</h1>
        </div>
      </div>
    </header>
  )
}

const ITENS: { id: Aba; rotulo: string; Icone: ComponentType<{ tamanho?: number }> }[] = [
  { id: 'painel', rotulo: 'Início', Icone: IconePainel },
  { id: 'produtos', rotulo: 'Produtos', Icone: IconeProdutos },
  { id: 'escanear', rotulo: 'Compras', Icone: IconeLerNota },
  { id: 'vendas', rotulo: 'Vendas', Icone: IconeVendas },
  { id: 'ajustes', rotulo: 'Ajustes', Icone: IconeAjustes },
]

export function Nav({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  return (
    <nav className="nav">
      {ITENS.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          aria-current={aba === id ? 'page' : undefined}
          className={(aba === id ? 'ativo ' : '') + (id === 'escanear' ? 'central' : '')}
          onClick={() => {
            setAba(id)
            window.scrollTo({ top: 0 })
          }}
        >
          <span className="ico"><Icone tamanho={id === 'escanear' ? 28 : 22} /></span>
          {rotulo}
        </button>
      ))}
    </nav>
  )
}

export function Toast({ msg }: { msg: string }) {
  return <div className="toast">✓ {msg}</div>
}

export function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="campo">
      {rotulo}
      {children}
      {dica && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--suave)' }}>{dica}</span>}
    </label>
  )
}

export function Dinheiro(props: { valor: number | string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="prefixo">
      <span>R$</span>
      <input
        className="entrada"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder={props.placeholder ?? '0,00'}
        value={props.valor}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  )
}
