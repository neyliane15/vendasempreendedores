import { modoDemo } from '../lib/supabase'

export type Aba = 'painel' | 'produtos' | 'escanear' | 'vendas' | 'ajustes'

export function Topo({ nome }: { nome: string }) {
  return (
    <header className="topo">
      <div className="topo-linha">
        <div className="topo-logo">🧁</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <small>Sabor &amp; Lucro{modoDemo ? ' · demonstração' : ''}</small>
          <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</h1>
        </div>
      </div>
    </header>
  )
}

const ITENS: { id: Aba; rotulo: string; ico: string }[] = [
  { id: 'painel', rotulo: 'Início', ico: '📊' },
  { id: 'produtos', rotulo: 'Produtos', ico: '🍰' },
  { id: 'escanear', rotulo: 'Ler nota', ico: '📸' },
  { id: 'vendas', rotulo: 'Vendas', ico: '🛒' },
  { id: 'ajustes', rotulo: 'Ajustes', ico: '⚙️' },
]

export function Nav({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  return (
    <nav className="nav">
      {ITENS.map((i) => (
        <button
          key={i.id}
          className={(aba === i.id ? 'ativo ' : '') + (i.id === 'escanear' ? 'central' : '')}
          onClick={() => {
            setAba(i.id)
            window.scrollTo({ top: 0 })
          }}
        >
          <span className="ico">{i.ico}</span>
          {i.rotulo}
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
