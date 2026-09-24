import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '../styles/global.css'
import '../styles/app-modal.css'
import '../styles/options-popup.css'
import '../styles/toolbar-controls.css'
import '../styles/app-sidebar.css'
import '../styles/data-table.css'
import '../styles/astro-chat.css'
import '../styles/login.css'
import '../styles/create-workspace.css'
import '../styles/access-key-verified.css'
import '../styles/workspace-created.css'
import '../styles/create-password.css'
import '../styles/include-company-information.css'
import '../styles/attach-excel-file.css'
import '../styles/payment.css'
import '../styles/payment-layout.css'
import '../styles/charge-explanation.css'
import '../styles/spreadsheet-explanation.css'
import '../styles/loading-screen.css'
import '../styles/set-address.css'
import '../styles/not-found.css'
import '../styles/main-position-screen.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
