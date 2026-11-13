import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criar, setCriar] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setMsg('')
    setCarregando(true)
    const r = criar
      ? await supabase!.auth.signUp({ email, password: senha })
      : await supabase!.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (r.error) setErro(criar ? 'Não deu para criar a conta. A senha precisa ter 6 letras ou números.' : 'E-mail ou senha incorretos.')
    else if (criar && !r.data.session) setMsg('Conta criada! Confirme pelo link que enviamos no seu e-mail.')
  }

  return (
    <div className="boas-vindas">
      <div className="marca">
        <div className="emojis">🍰🥐🍕</div>
        <h1>Sabor &amp; Lucro</h1>
        <p className="sub">Descubra o preço certo e veja quanto você lucra de verdade.</p>
      </div>
      <div className="toalha" />
      <form className="cartao pilha" onSubmit={entrar}>
        <h2>{criar ? '✨ Criar minha conta' : '👋 Entrar'}</h2>
        <label className="campo">
          E-mail
          <input className="entrada" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="campo">
          Senha
          <input className="entrada" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={criar ? 'new-password' : 'current-password'} />
        </label>
        {erro && <div className="aviso erro">{erro}</div>}
        {msg && <div className="aviso">{msg}</div>}
        <button className="botao" disabled={carregando}>{carregando ? 'Aguarde…' : criar ? 'Criar conta' : 'Entrar'}</button>
        <button type="button" className="link" onClick={() => setCriar(!criar)}>
          {criar ? 'Já tenho conta' : 'Ainda não tenho conta'}
        </button>
      </form>
    </div>
  )
}
