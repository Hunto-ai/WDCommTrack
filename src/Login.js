import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setError(''); // Clear error when user types
  };

  const handleLogin = (event) => {
    event.preventDefault(); // Prevent default form submission
    // Simple password check (Case-sensitive)
    if (password === 'Henderson') {
      onLoginSuccess(); // Call the function passed from App component
    } else {
      setError('Incorrect password. Please try again.');
      setPassword(''); // Clear the password field on error
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-100">
      {/* Login Form Container */}
      <form
        className="flex flex-col items-center p-8 bg-white border border-gray-300 rounded-lg shadow-md w-full max-w-sm"
        onSubmit={handleLogin}
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">Sales Tool Login</h2>

        {/* Password Label */}
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2 self-start w-full"
        >
          Password:
        </label>

        {/* Password Input */}
        <input
          type="password"
          id="password"
          value={password}
          onChange={handlePasswordChange}
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />

        {/* Login Button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
        >
          Login
        </button>

        {/* Error Message Area */}
        {error && <p className="mt-3 text-sm text-red-600 min-h-[20px]">{error}</p>}
      </form>
    </div>
  );
}

export default Login;
