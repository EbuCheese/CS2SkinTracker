import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css'
import Navbar from './components/NavBar'
import Home from './pages/Home'

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/prices" element={<Prices />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/craft-analysis" element={<CraftAnalysis />} /> */}
      </Routes>
    </Router>
  );
}


export default App
