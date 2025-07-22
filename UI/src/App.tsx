import React from 'react';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #1e293b 100%)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
        CloutX Dashboard - Basic Test
      </h1>
      
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>System Check</h2>
        <p style={{ marginBottom: '1rem' }}>✅ React is working!</p>
        <p style={{ marginBottom: '1rem' }}>✅ Inline styles are working!</p>
        <p style={{ marginBottom: '1rem' }}>✅ JavaScript is working!</p>
        <p>Current time: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

export default App; 