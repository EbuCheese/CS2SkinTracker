import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './index.css'
import Navbar from './components/NavBar'
import Home from './pages/Home'
import InvestmentsPage from './pages/Investments';
import BetaKeyEntry from './pages/BetaKeyEntry';

function App() {
  const [hasValidBetaKey, setHasValidBetaKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userSession, setUserSession] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check if we have a stored beta user session
      const storedUser = localStorage.getItem('beta_user');
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Verify the session is still valid in the database
        const { data: sessionData, error } = await supabase
          .from('beta_users')
          .select('*')
          .eq('session_id', userData.session_id)
          .single();

        if (!error && sessionData) {
          setUserSession(userData);
          setHasValidBetaKey(true);
        } else {
          // Session is invalid, clear stored data
          localStorage.removeItem('beta_user');
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      // Clear any corrupted stored data
      localStorage.removeItem('beta_user');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle successful beta key verification
  const handleBetaKeySuccess = (userData) => {
    setUserSession(userData);
    setHasValidBetaKey(true);
    
    // Store user info in localStorage for session persistence
    localStorage.setItem('beta_user', JSON.stringify({
      id: userData.id,
      session_id: userData.session_id,
      beta_key_id: userData.beta_key_id
    }));
  };

  // Function to handle logout/session clearing
  const handleLogout = () => {
    localStorage.removeItem('beta_user');
    setUserSession(null);
    setHasValidBetaKey(false);
  };

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user hasn't entered valid beta key, show the beta entry page
  if (!hasValidBetaKey) {
    return (
      <BetaKeyEntry 
        onSuccess={handleBetaKeySuccess} 
        supabase={supabase}
      />
    );
  }

  // Once beta key is verified, show the main app
  return (
    <Router>
      <Navbar userSession={userSession} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home userSession={userSession} />} />
        <Route path="/investments" element={<InvestmentsPage userSession={userSession} />} />
        {/* <Route path="/prices" element={<Prices />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/craft-analysis" element={<CraftAnalysis />} /> */}
      </Routes>
    </Router>
  );
}

export default App