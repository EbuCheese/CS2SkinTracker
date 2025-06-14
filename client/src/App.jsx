import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css'
import Navbar from './components/NavBar'
import Home from './pages/Home'
import InvestmentsPage from './pages/Investments';

function App() {
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
