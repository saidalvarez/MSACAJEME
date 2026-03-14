import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TicketProvider } from './context/TicketContext';
import { ClientProvider } from './context/ClientContext'; 
import { ExpenseProvider } from './context/ExpenseContext';
import { InventoryProvider } from './context/InventoryContext';
import { SalesProvider } from './context/SalesContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <TicketProvider>
          <ExpenseProvider>
            <InventoryProvider>
              <SalesProvider>
                <ClientProvider>
                  <App />
                </ClientProvider>
              </SalesProvider>
            </InventoryProvider>
          </ExpenseProvider>
      </TicketProvider>
  </React.StrictMode>,
);