import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RealTimeData from './pages/RealTimeData';
import HistoryData from './pages/HistoryData';
import CompareData from './pages/CompareData';

const App = () => {
    return (
      <Router>
        <div className="app-container">
          <Navbar />
          <div className="content-container">
            <Routes>
              <Route path="/" element={<RealTimeData />} /> {/* Real-Time Data */}
              <Route path="/historical" element={<HistoryData/>} /> {/* HistoryData Data */}
              <Route path="/comparison" element={<CompareData />} /> {/* CompareData Data */}
            </Routes>
          </div>
        </div>
      </Router>
    );
  };

export default App;
