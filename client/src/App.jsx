// App.js - Updated with revoke functionality
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
                onRevoke={revokeBetaKey} // Pass the revoke function
              />
            } 
          />
        </Routes>
      </Router>
    );
  }

  // Quick login flow - user has stored beta key but no active session
  if (hasStoredBetaKey) {
    return (
      <QuickLogin
        onQuickLogin={quickLogin}
        onNewBetaKey={clearStoredBetaKey}
        storedBetaKey={storedBetaKey}
      />
    );
  }

  // Initial beta key entry
  return (
    <BetaKeyEntry onSuccess={loginWithBetaKey} />
  );
}

export default App;