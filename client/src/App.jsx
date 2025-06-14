import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css'
import Navbar from './components/NavBar'
import Home from './pages/Home'
import InvestmentsPage from './pages/Investments';
import BetaKeyEntry from './pages/BetaKeyEntry'; // Import the beta key component

function App() {
  const [hasValidBetaKey, setHasValidBetaKey] = useState(false);

  // Function to handle successful beta key verification
  const handleBetaKeySuccess = () => {
    setHasValidBetaKey(true);
  };

  // If user hasn't entered valid beta key, show the beta entry page
  if (!hasValidBetaKey) {
    return <BetaKeyEntry onSuccess={handleBetaKeySuccess} />;
  }

  // Once beta key is verified, show the main app
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/investments" element={<InvestmentsPage />} />
        {/* <Route path="/prices" element={<Prices />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/craft-analysis" element={<CraftAnalysis />} /> */}
      </Routes>
    </Router>
  );
}

export default App