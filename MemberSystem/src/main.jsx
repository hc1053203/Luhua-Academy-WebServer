import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import System from './System.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <System />
  </StrictMode>,
)
