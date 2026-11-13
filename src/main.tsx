import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ProtecaoErro } from './components/Aviso'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProtecaoErro>
      <App />
    </ProtecaoErro>
  </StrictMode>,
)
