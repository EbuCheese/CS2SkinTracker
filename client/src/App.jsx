// App.js - Updated with CS Data Provider
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/hooks/auth';
import { CSDataProvider } from './contexts/CSDataContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css'
import Home from './pages/Home'
import InvestmentsPage from './pages/Investments';
import AccountPage from './pages/Account';
import BetaKeyEntry from './pages/BetaKeyEntry';
import QuickLogin from './pages/QuickLogin';
import {LoadingSpinner, Navbar} from './components'

function App() {
  const {
    userSession,
    hasValidBetaKey,
    hasStoredBetaKey,
    storedBetaKey,
    isLoading,
    revocationMessage,
    isStoredKeyRevoked,
    clearRevocationMessage,
    loginWithBetaKey,
    quickLogin,
    logout,
    clearStoredBetaKey,
    revokeBetaKey
  } = useAuth();

  // Show loading spinner while checking session
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Main app - user has valid session
  if (hasValidBetaKey) {
    return (
      <ToastProvider>
        <CSDataProvider>
          <Router>
            <Navbar userSession={userSession} onLogout={logout} />
            <Routes>
              <Route path="/" element={<Home userSession={userSession} />} />
              <Route path="/investments" element={<InvestmentsPage userSession={userSession} />} />
              <Route
                path="/account"
                element={
                  <AccountPage
                    userSession={userSession}
                    onLogout={logout}
                    onRevoke={revokeBetaKey}
                  />
                }
              />
            </Routes>
          </Router>
        </CSDataProvider>
      </ToastProvider>
    );
  }

  // Quick login flow - user has stored beta key but no active session
  if (hasStoredBetaKey) {
    return (
      <QuickLogin
        onQuickLogin={quickLogin}
        onNewBetaKey={clearStoredBetaKey}
        storedBetaKey={storedBetaKey}
        revocationMessage={revocationMessage}
        isStoredKeyRevoked={isStoredKeyRevoked}
        onClearRevocationMessage={clearRevocationMessage}
      />
    );
  }

  // Initial beta key entry
  return (
    <BetaKeyEntry
      onSuccess={loginWithBetaKey}
      revocationMessage={revocationMessage}
      onClearRevocationMessage={clearRevocationMessage}
    />
  );
}

export default App;