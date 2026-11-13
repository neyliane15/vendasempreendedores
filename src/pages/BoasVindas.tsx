import { useState } from 'react'
import { PADROES_MERCADO } from '../lib/calc'
import { salvarNegocio } from '../lib/db'
import type { Negocio } from '../lib/types'
import { Percentuais } from '../components/Percentuais'

export default function BoasVindas({ aoSalvar }: { aoSalvar: (n: Negocio) => void }) {
  const [passo, setPasso] = useState(1)
  const [n, setN] = useState<Negocio>({ nome: '', ...PADROES_MERCADO, markup_padrao: 2.5 })
  const [erro, setErro] = useState('')

  async function concluir() {
    try {
      aoSalvar(await salvarNegocio(n))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <div className="boas-vindas">
      <div className="marca">
        <div className="emojis">🍰🥐🍕</div>
        <h1>{passo === 1 ? 'Vamos começar!' : 'Seus custos escondidos'}</h1>
        <p className="sub">
          {passo === 1
            ? 'Em 1 minuto o seu negócio está pronto para calcular preços.'
            : 'Já deixamos tudo preenchido com a média do mercado. Mude só se quiser.'}
        </p>
      </div>
      <div className="toalha" />
      {passo === 1 ? (
        <div className="cartao pilha">
          <h2>🏪 Qual o nome do seu negócio?</h2>
          <input
            className="entrada"
            placeholder="Ex.: Doces da Maria"
            value={n.nome}
            autoFocus
            onChange={(e) => setN({ ...n, nome: e.target.value })}
          />
          <button className="botao" disabled={!n.nome.trim()} onClick={() => setPasso(2)}>
            Continuar →
          </button>
        </div>
      ) : (
        <div className="cartao pilha">
          <h2>🧾 Além dos ingredientes</h2>
          <p className="sub" style={{ marginTop: -6 }}>
            Esses gastos entram em todos os produtos, como uma porcentagem em cima dos ingredientes.
          </p>
          <Percentuais n={n} onChange={setN} />
          {erro && <div className="aviso erro">{erro}</div>}
          <button className="botao verde" onClick={concluir}>Pronto, começar! 🎉</button>
          <button className="link" onClick={() => setPasso(1)}>← Voltar</button>
        </div>
      )}
    </div>
  )
}
