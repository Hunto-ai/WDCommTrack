import React, { useState } from 'react';
import Login from './Login';
// Import the actual Calculator component
import Calculator from './Calculator';
import './App.css'; // Assuming default Create React App CSS file

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="App">
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        // Render the main Calculator component after login
        <Calculator />
      )}
    </div>
  );
}

export default App;