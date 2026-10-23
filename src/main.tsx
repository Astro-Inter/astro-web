import '../styles/actionFeedback.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app'
import AuthenticationProvider from './providers/authentication'
import WorkspaceRegistrationProvider from './providers/workspaceRegistration'
import AccessibilityProvider from './providers/accessibility'
import AccessibilityRuntimeProvider from './providers/accessibilityRuntime'
import AccessibilityTools from './components/accessibilityTools'
import AccessibilitySkipLink from './components/accessibilitySkipLink'
import '@fontsource/opendyslexic/400.css'
import '@fontsource/opendyslexic/700.css'
import './services/firebase'
import '../styles/global.css'
import '../styles/mainHomeScreen.css'
import '../styles/mainDashboardsScreen.css'
import '../styles/analytics.css'
import '../styles/notificationModal.css'
import '../styles/appModal.css'
import '../styles/optionsPopup.css'
import '../styles/toolbarControls.css'
import '../styles/appSidebar.css'
import '../styles/dataTable.css'
import '../styles/astroChat.css'
import '../styles/login.css'
import '../styles/createWorkspace.css'
import '../styles/accessKeyVerified.css'
import '../styles/statusScreen.css'
import '../styles/workspaceCreated.css'
import '../styles/createPassword.css'
import '../styles/passwordRecovery.css'
import '../styles/includeCompanyInformation.css'
import '../styles/attachExcelFile.css'
import '../styles/payment.css'
import '../styles/paymentLayout.css'
import '../styles/chargeExplanation.css'
import '../styles/spreadsheetExplanation.css'
import '../styles/loadingScreen.css'
import '../styles/setAddress.css'
import '../styles/notFound.css'
import '../styles/mainPositionScreen.css'
import '../styles/mainManagerScreen.css'
import '../styles/mainConformityScreen.css'
import '../styles/mainFormScreen.css'
import '../styles/mainEventScreen.css'
import '../styles/createEvent.css'
import '../styles/eventInformation.css'
import '../styles/regulatoryStandardsDialog.css'
import '../styles/createForm.css'
import '../styles/editForm.css'
import '../styles/toggleSwitch.css'
import '../styles/workspaceSettings.css'
import '../styles/accountSettings.css'
import '../styles/apiLoading.css'
import '../styles/accessibility.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthenticationProvider>
        <AccessibilityProvider>
          <AccessibilitySkipLink />
          <AccessibilityRuntimeProvider>
            <WorkspaceRegistrationProvider>
              <App />
            </WorkspaceRegistrationProvider>
            <AccessibilityTools />
          </AccessibilityRuntimeProvider>
        </AccessibilityProvider>
      </AuthenticationProvider>
    </BrowserRouter>
  </StrictMode>,
)
