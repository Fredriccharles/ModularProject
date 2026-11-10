import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { isConfigured } from './lib/supabase.js';

const tree = (
  <BrowserRouter>
    {isConfigured ? <AuthProvider><App /></AuthProvider> : <App />}
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{tree}</React.StrictMode>);
