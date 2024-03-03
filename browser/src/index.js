import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthContextProvider } from './contexts/authContext.js';
import * as App from './App.js'
import './style/main.css'

const router = createBrowserRouter([
  { path: '/', element: <App.Auth page={<App.Dashboard />} /> },
  { path: '/targets', element: <App.Auth page={<App.Targets />} /> },
  { path: '/auth', element: <App.AuthRedirect />},
  { path: '/log-out', element: <App.LogoutRedirect />},
  { path: '*', element: <App.NotFound />}
])


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  </React.StrictMode>
);
