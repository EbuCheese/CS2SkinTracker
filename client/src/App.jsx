import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import './index.css'
import Navbar from './components/NavBar'
import Home from './pages/Home'
import InvestmentsPage from './pages/Investments';
import AccountPage from './pages/Account';
import BetaKeyEntry from './pages/BetaKeyEntry';
import QuickLogin from './pages/QuickLogin';
import LoadingSpinner from './components/LoadingSpinner';

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
    );
  }

  // Quick login flow - user has stored beta key but no active session
  // Only show if we actually have a stored key (not just a revocation message)
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

  // Initial beta key entry (including when showing revocation messages without stored keys)
  return (
    <BetaKeyEntry
      onSuccess={loginWithBetaKey}
      revocationMessage={revocationMessage}
      onClearRevocationMessage={clearRevocationMessage}
    />
  );
}

export default App;