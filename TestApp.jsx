import React from 'react';
import ReactDOM from 'react-dom/client';
import LaCabra from './LaCabra';

const App = () => (
  <div style={{ 
    width: '100vw', 
    height: '100vh', 
    background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <div style={{ textAlign: 'center', color: '#1a365d' }}>
      <h1>🐐 La Cabra Test Page</h1>
      <p>Mira la esquina inferior derecha...</p>
    </div>
    <LaCabra />
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
