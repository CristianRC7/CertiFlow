import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import AdminPanelComponent from './AdminPanel.jsx';
import EventsPanelComponent from './EventsPanel.jsx';
import { Users, Calendar, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('usuarios');

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      window.location.href = '/';
      return;
    }
    try {
      const sessionData = JSON.parse(adminSession);
      if (!sessionData.isAdmin || !sessionData.adminVerified) {
        window.location.href = '/';
      }
    } catch {
      window.location.href = '/';
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('adminSession');
    document.cookie = 'adminSession=; path=/; max-age=0; SameSite=Strict';
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" duration={4000} closeButton richColors expand theme="light" />

      {/* Header con Navbar */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">

            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#cf152d] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-600">Sistema de Certificados CertiFlow</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
              </div>
            </div>

            {/* Navbar */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveSection('usuarios')}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === 'usuarios'
                    ? 'bg-[#cf152d] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Usuarios</span>
                <span className="sm:hidden">Usu.</span>
              </button>

              <button
                onClick={() => setActiveSection('eventos')}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === 'eventos'
                    ? 'bg-[#cf152d] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Eventos</span>
                <span className="sm:hidden">Eve.</span>
              </button>
            </nav>

            {/* Cerrar Sesión */}
            <button
              onClick={cerrarSesion}
              className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-[#cf152d] hover:text-[#cf152d]/80 transition-colors cursor-pointer px-2 sm:px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido dinámico */}
      <div>
        {activeSection === 'usuarios' ? <AdminPanelComponent /> : <EventsPanelComponent />}
      </div>
    </div>
  );
};

export default AdminDashboard;