import { Component, type ReactNode } from 'react'

export function TelaAviso({ titulo, texto, emoji = '⚠️' }: { titulo: string; texto: ReactNode; emoji?: string }) {
  return (
    <div className="boas-vindas">
      <div className="toalha" />
      <div className="cartao pilha">
        <h2>{emoji} {titulo}</h2>
        <div className="sub" style={{ marginTop: 0 }}>{texto}</div>
        <button className="botao" onClick={() => location.reload()}>Tentar de novo</button>
      </div>
    </div>
  )
}

export function Carregando() {
  return (
    <div className="boas-vindas" style={{ justifyItems: 'center' }}>
      <div className="carregando"><div className="giro" /> Carregando…</div>
    </div>
  )
}

/** Se algo quebrar, mostra a mensagem em vez de deixar a tela vazia. */
export class ProtecaoErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }
  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }
  render() {
    if (this.state.erro)
      return (
        <TelaAviso
          titulo="Algo deu errado"
          texto={<>Mande um print desta tela para o suporte.<br /><code style={{ fontSize: 11, wordBreak: 'break-word' }}>{this.state.erro.message}</code></>}
        />
      )
    return this.props.children
  }
}
