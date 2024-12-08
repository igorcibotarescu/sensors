import React from 'react';
import { Link } from 'react-router-dom';
import '../style/NavBar.css'; // Import the external CSS

const Navbar = () => (
    <nav className="navbar">
      <h2>IoT Dashboard</h2>
      <div>
        <Link to="/" className="navbar-link">Real-Time Data</Link>
        <Link to="/historical" className="navbar-link">Historical Data</Link>
        <Link to="/comparison" className="navbar-link">Compare Sensors</Link>
      </div>
    </nav>
  );

export default Navbar;
