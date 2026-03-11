import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Config from '../utils/Config.js';
import { Edit, Trash2, Eye, Shield, Plus, UserMinus, Upload, FileText, Search, X, Users, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from './Modal.jsx';
import UserModal from './UserModal.jsx';
import ModalParticipaciones from './ModalParticipaciones.jsx';

const AdminPanelComponent = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina] = useState(20);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalParticipaciones, setModalParticipaciones] = useState(false);
  const [modalDarAdmin, setModalDarAdmin] = useState(false);
  const [modalSubirArchivo, setModalSubirArchivo] = useState(false);
  const [modalRegistroMasivo, setModalRegistroMasivo] = useState(false);

  // Subir archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Registro masivo a eventos
  const [rmFile, setRmFile]               = useState(null);
  const [rmFileName, setRmFileName]       = useState('');
  const [rmUploading, setRmUploading]     = useState(false);
  const [rmDescargando, setRmDescargando] = useState(false);
  const [rmResultado, setRmResultado]     = useState(null); // { exitosos, duplicados, errores[] }

  useEffect(() => { cargarUsuarios(1, busqueda); }, []);
  useEffect(() => { filtrarUsuarios(); }, [usuarios, filtro]);

  const cargarUsuarios = async (pagina = paginaActual, terminoBusqueda = busqueda) => {
    try {
      setLoading(true);
      const adminSession = localStorage.getItem('adminSession');
      if (!adminSession) { setError('No hay sesión de administrador'); return; }
      const { user } = JSON.parse(adminSession);
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'obtener_usuarios', admin_user_id: user.id, pagina, por_pagina: porPagina, busqueda: terminoBusqueda }),
      });
      const data = await response.json();
      if (data.success) { setUsuarios(data.usuarios); setTotalUsuarios(data.total); setPaginaActual(data.pagina_actual); setTotalPaginas(data.total_paginas); }
      else setError(data.message || 'Error al cargar usuarios');
    } catch { setError('Error de conexión al cargar usuarios'); }
    finally { setLoading(false); }
  };

  const handleBusquedaChange = (e) => {
    setBusqueda(e.target.value);
  };

  const handleBuscar = () => {
    cargarUsuarios(1, busqueda);
  };

  const handleBusquedaKeyDown = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    cargarUsuarios(1, '');
  };

  const filtrarUsuarios = () => {
    if (filtro === 'administradores') setUsuariosFiltrados(usuarios.filter((u) => u.es_admin === 1));
    else if (filtro === 'usuarios') setUsuariosFiltrados(usuarios.filter((u) => u.es_admin === 0));
    else setUsuariosFiltrados(usuarios);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAdminId = () => JSON.parse(localStorage.getItem('adminSession')).user.id;

  // ── Handlers de modales ───────────────────────────────────────────────────
  const openUserModal = (mode, user = null) => { setUserModalMode(mode); setSelectedUser(user); setUserModalOpen(true); };
  const closeUserModal = () => { setUserModalOpen(false); setSelectedUser(null); };
  const openParticipaciones = (user) => { setSelectedUser(user); setModalParticipaciones(true); };
  const closeParticipaciones = () => { setModalParticipaciones(false); setSelectedUser(null); };
  const openDarAdmin = (user) => { setSelectedUser(user); setModalDarAdmin(true); };
  const closeDarAdmin = () => { setModalDarAdmin(false); setSelectedUser(null); };
  const closeSubirArchivo = () => { setModalSubirArchivo(false); setSelectedFile(null); setFileName(''); };
  const closeRegistroMasivo = () => { setModalRegistroMasivo(false); setRmFile(null); setRmFileName(''); setRmResultado(null); };

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleSaveUser = async (formData) => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: userModalMode === 'add' ? 'agregar_usuario' : 'editar_usuario', admin_user_id: getAdminId(), user_data: formData, user_id: userModalMode === 'edit' ? selectedUser.id : null }),
      });
      const data = await response.json();
      if (data.success) { await cargarUsuarios(); toast.success(data.message || 'Usuario guardado correctamente'); }
      else { toast.error(data.message || 'Error al guardar usuario'); throw new Error(data.message); }
    } catch { toast.error('Error al guardar usuario'); throw new Error('Error al guardar usuario'); }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_usuario', admin_user_id: getAdminId(), user_id: userId }),
      });
      const data = await response.json();
      if (data.success) { await cargarUsuarios(); toast.success(data.message || 'Usuario eliminado correctamente'); }
      else { toast.error(data.message || 'Error al eliminar usuario'); throw new Error(data.message); }
    } catch { toast.error('Error al eliminar usuario'); throw new Error('Error al eliminar usuario'); }
  };

  const handleQuitarAdmin = async (usuario) => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quitar_admin', admin_user_id: getAdminId(), user_id: usuario.id }),
      });
      const data = await response.json();
      if (data.success) { await cargarUsuarios(); toast.success('Privilegios de administrador removidos correctamente'); }
      else { toast.error(data.message || 'Error al quitar admin'); throw new Error(data.message); }
    } catch { toast.error('Error al quitar admin al usuario'); }
  };

  const handleConfirmarDarAdmin = async (e) => {
    e.preventDefault();
    const codigo = new FormData(e.target).get('codigo');
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dar_admin', admin_user_id: getAdminId(), user_id: selectedUser.id, codigo }),
      });
      const data = await response.json();
      if (data.success) { await cargarUsuarios(); closeDarAdmin(); toast.success('Usuario promovido a administrador correctamente'); }
      else { toast.error(data.message || 'Error al dar admin'); throw new Error(data.message); }
    } catch { toast.error('Error al dar admin al usuario'); }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowed.includes(file.type)) { toast.error('Solo se permiten archivos CSV y Excel (.xls, .xlsx)'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('El archivo es demasiado grande. Máximo 5MB'); event.target.value = ''; return; }
    setSelectedFile(file); setFileName(file.name);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) { toast.error('Por favor selecciona un archivo'); return; }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('action', 'subir_usuarios_archivo');
      formData.append('admin_user_id', getAdminId());
      formData.append('archivo', selectedFile);
      const response = await fetch(Config.getAdminUrl(), { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) { await cargarUsuarios(); toast.success(data.message); closeSubirArchivo(); }
      else toast.error(data.message);
    } catch { toast.error('Error al subir archivo'); }
    finally { setUploading(false); }
  };

  const handleDescargarReferencia = async () => {
    try {
      setRmDescargando(true);
      const { user } = JSON.parse(localStorage.getItem('adminSession'));
      const res  = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'obtener_usuarios_eventos_referencia', admin_user_id: user.id }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || 'Error al obtener datos'); return; }

      // Hoja 1: Usuarios
      const wsUsuarios = XLSX.utils.json_to_sheet(
        data.usuarios.map(u => ({ Usuario: u.usuario, Nombre: u.nombre, Apellido: u.apellido }))
      );
      wsUsuarios['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 25 }];

      // Hoja 2: Eventos
      const wsEventos = XLSX.utils.json_to_sheet(
        data.eventos.map(e => ({ ID: e.id, Evento: e.nombre_evento }))
      );
      wsEventos['!cols'] = [{ wch: 8 }, { wch: 40 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios');
      XLSX.utils.book_append_sheet(wb, wsEventos, 'Eventos');
      XLSX.writeFile(wb, 'referencia_participaciones.xlsx');
      toast.success('Archivo de referencia descargado');
    } catch { toast.error('Error al generar el archivo'); }
    finally { setRmDescargando(false); }
  };

  const handleSubirParticipaciones = async () => {
    if (!rmFile) { toast.error('Selecciona un archivo CSV'); return; }
    try {
      setRmUploading(true);
      setRmResultado(null);
      const { user } = JSON.parse(localStorage.getItem('adminSession'));
      const formData = new FormData();
      formData.append('action', 'subir_participaciones_archivo');
      formData.append('admin_user_id', user.id);
      formData.append('archivo', rmFile);
      const res  = await fetch(Config.getAdminUrl(), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setRmResultado({ exitosos: data.exitosos, duplicados: data.duplicados, errores: data.errores || [] });
        if (data.exitosos > 0) await cargarUsuarios(1, busqueda);
        if (data.errores?.length === 0) toast.success(data.message);
        else toast.warning(data.message);
      } else { toast.error(data.message || 'Error al procesar el archivo'); }
    } catch { toast.error('Error al subir el archivo'); }
    finally { setRmUploading(false); }
  };

  const handleCambiarPagina = (p) => { if (p >= 1 && p <= totalPaginas) { setPaginaActual(p); cargarUsuarios(p, busqueda); } };

  const generarBotonesPaginacion = () => {
    const botones = [];
    const max = 5;
    let ini = Math.max(1, paginaActual - Math.floor(max / 2));
    let fin = Math.min(totalPaginas, ini + max - 1);
    if (fin - ini + 1 < max) ini = Math.max(1, fin - max + 1);
    if (paginaActual > 1) botones.push(<button key="prev" onClick={() => handleCambiarPagina(paginaActual - 1)} className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 cursor-pointer">Anterior</button>);
    for (let i = ini; i <= fin; i++) botones.push(<button key={i} onClick={() => handleCambiarPagina(i)} className={`px-3 py-2 text-sm font-medium border cursor-pointer ${i === paginaActual ? 'bg-[#cf152d] text-white border-[#cf152d]' : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'}`}>{i}</button>);
    if (paginaActual < totalPaginas) botones.push(<button key="next" onClick={() => handleCambiarPagina(paginaActual + 1)} className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 cursor-pointer">Siguiente</button>);
    return botones;
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg flex items-center space-x-3">
        <svg className="animate-spin h-6 w-6 text-[#cf152d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        <span className="text-gray-600">Cargando datos...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button onClick={cargarUsuarios} className="mt-4 bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6 max-w-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{totalUsuarios}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Usuarios</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => openUserModal('add')} className="bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer flex items-center space-x-2"><Plus size={16} /><span>Agregar Usuario</span></button>
                <button onClick={() => setModalSubirArchivo(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer flex items-center space-x-2"><Upload size={16} /><span>Subir Archivo</span></button>
                <button onClick={() => setModalRegistroMasivo(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-2"><Users size={16} /><span>Registrar en Eventos</span></button>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 text-sm">
                  <option value="todos">Todos los usuarios</option>
                  <option value="administradores">Solo administradores</option>
                  <option value="usuarios">Solo usuarios</option>
                </select>
                <span className="text-sm text-gray-500">({usuariosFiltrados.length} de {totalUsuarios})</span>
              </div>
            </div>
            {/* Buscador */}
            <div className="mt-4">
              <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={handleBusquedaChange}
                    onKeyDown={handleBusquedaKeyDown}
                    placeholder="Buscar por nombre, apellido o usuario..."
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200"
                  />
                  {busqueda && (
                    <button onClick={limpiarBusqueda} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleBuscar}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#cf152d] text-white rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer text-sm font-medium flex-shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
              </div>
              {busqueda && (
                <p className="mt-1 text-xs text-gray-500">
                  {totalUsuarios} resultado{totalUsuarios !== 1 ? 's' : ''} para "<span className="font-medium">{busqueda}</span>"
                </p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>{['Usuario', 'Nombre', 'Apellido', 'Tipo', 'Acciones'].map((h) => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.usuario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.apellido}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.es_admin === 1 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{u.es_admin === 1 ? 'Administrador' : 'Usuario'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openUserModal('edit', u)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 cursor-pointer" title="Editar"><Edit size={18} /></button>
                        <button onClick={() => openUserModal('delete', u)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 cursor-pointer" title="Eliminar"><Trash2 size={18} /></button>
                        {u.es_admin === 0 && <button onClick={() => openParticipaciones(u)} className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-50 cursor-pointer" title="Ver participaciones"><Eye size={18} /></button>}
                        {u.es_admin === 1
                          ? <button onClick={() => handleQuitarAdmin(u)} className="text-purple-600 hover:text-purple-800 p-1 rounded-md hover:bg-purple-50 cursor-pointer" title="Quitar admin"><UserMinus size={18} /></button>
                          : <button onClick={() => openDarAdmin(u)} className="text-orange-600 hover:text-orange-800 p-1 rounded-md hover:bg-orange-50 cursor-pointer" title="Dar admin"><Shield size={18} /></button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usuariosFiltrados.length === 0 && (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
              <p className="mt-1 text-sm text-gray-500">{filtro === 'todos' ? 'No hay usuarios registrados en el sistema.' : `No hay usuarios con el filtro "${filtro}".`}</p>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">Mostrando <span className="font-medium">{((paginaActual - 1) * porPagina) + 1}</span> a <span className="font-medium">{Math.min(paginaActual * porPagina, totalUsuarios)}</span> de <span className="font-medium">{totalUsuarios}</span></div>
              <div className="flex space-x-1">{generarBotonesPaginacion()}</div>
            </div>
          )}
        </div>
      </main>

      {/* ── UserModal (agregar / editar / eliminar) ── */}
      <UserModal isOpen={userModalOpen} onClose={closeUserModal} mode={userModalMode} user={selectedUser} onSave={handleSaveUser} onDelete={handleDeleteUser} />

      {/* ── Modal participaciones ── */}
      <ModalParticipaciones isOpen={modalParticipaciones} onClose={closeParticipaciones} user={selectedUser} />

      {/* ── Modal dar admin ── */}
      <Modal
        isOpen={modalDarAdmin}
        onClose={closeDarAdmin}
        title="Dar Administrador"
        icon={<Shield className="w-6 h-6 text-orange-600" />}
        iconBg="bg-orange-100"
      >
        <form onSubmit={handleConfirmarDarAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <input type="text" value={`${selectedUser?.nombre} ${selectedUser?.apellido} (${selectedUser?.usuario})`} disabled className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código de Administrador</label>
            <input type="text" name="codigo" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" placeholder="Ingresa el código de administrador" required />
            <p className="mt-1 text-sm text-gray-500">Este código será usado para acceder al panel de administración</p>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={closeDarAdmin} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">Dar Administrador</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal subir archivo ── */}
      <Modal
        isOpen={modalSubirArchivo}
        onClose={closeSubirArchivo}
        title="Subir Usuarios desde Archivo"
        icon={<FileText className="w-6 h-6 text-green-600" />}
        iconBg="bg-green-100"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Archivo</label>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" />
            {fileName && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg mt-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-green-700">{fileName}</span>
              </div>
            )}
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 space-y-1">
            <p className="font-medium text-blue-900">Formato requerido:</p>
            <p>• Columnas: <strong>nombre, apellido, usuario, contrasena</strong></p>
            <p>• La primera fila debe ser el encabezado</p>
            <p>• Las contraseñas se encriptarán automáticamente</p>
            <p>• Usuarios duplicados serán omitidos</p>
          </div>
          <div className="flex space-x-3 pt-2">
            <button onClick={closeSubirArchivo} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
            <button onClick={handleUploadFile} disabled={!selectedFile || uploading} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
              {uploading ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Procesando...</span></>) : (<><Upload size={16} /><span>Subir Archivo</span></>)}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal registro masivo a eventos ── */}
      <Modal
        isOpen={modalRegistroMasivo}
        onClose={closeRegistroMasivo}
        title="Registrar Usuarios en Eventos"
        icon={<Users className="w-6 h-6 text-blue-600" />}
        iconBg="bg-blue-100"
        maxWidth="max-w-2xl"
        scrollable
      >
        <div className="space-y-5">

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold text-blue-900">Formato del archivo CSV requerido:</p>
            <p>El archivo debe tener exactamente estas 4 columnas en la primera fila:</p>
            <code className="block bg-white border border-blue-200 rounded px-3 py-1.5 text-xs text-blue-900 font-mono mt-1">
              usuario, evento_id, nro_certificado, estado_pago
            </code>
            <p className="mt-2">• <strong>usuario</strong>: nombre de usuario del estudiante (campo <em>usuario</em> en el sistema)</p>
            <p>• <strong>evento_id</strong>: ID numérico del evento</p>
            <p>• <strong>nro_certificado</strong>: número o código del certificado</p>
            <p>• <strong>estado_pago</strong>: debe ser exactamente <strong>pagado</strong> o <strong>pendiente</strong></p>
            <p className="mt-2 text-blue-700">Un mismo usuario puede aparecer en múltiples filas (una por evento). Los duplicados se omiten sin cancelar la carga.</p>
          </div>

          {/* Botón descargar referencia */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Paso 1 — Descarga la referencia de usuarios y eventos</p>
            <button
              onClick={handleDescargarReferencia}
              disabled={rmDescargando}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {rmDescargando
                ? <><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Generando...</span></>
                : <><Download size={16} /><span>Descargar Usuarios y Eventos (Excel)</span></>
              }
            </button>
            <p className="text-xs text-gray-500 mt-1">Genera un Excel con dos pestañas: <strong>Usuarios</strong> (con su campo usuario) y <strong>Eventos</strong> (con sus IDs).</p>
          </div>

          {/* Upload CSV */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Paso 2 — Sube el archivo CSV con las participaciones</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files[0];
                if (!f) return;
                if (!f.name.endsWith('.csv')) { toast.error('Solo se permiten archivos CSV'); e.target.value = ''; return; }
                if (f.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); e.target.value = ''; return; }
                setRmFile(f); setRmFileName(f.name); setRmResultado(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 text-sm"
            />
            {rmFileName && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg mt-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">{rmFileName}</span>
              </div>
            )}
          </div>

          {/* Botones acción */}
          <div className="flex space-x-3">
            <button onClick={closeRegistroMasivo} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-sm">Cancelar</button>
            <button
              onClick={handleSubirParticipaciones}
              disabled={!rmFile || rmUploading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
            >
              {rmUploading
                ? <><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Procesando...</span></>
                : <><Upload size={16} /><span>Registrar Participaciones</span></>
              }
            </button>
          </div>

          {/* Panel de resultados */}
          {rmResultado && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">Resultado de la carga</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{rmResultado.exitosos}</p>
                    <p className="text-xs text-green-600 mt-0.5">Registradas</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{rmResultado.duplicados}</p>
                    <p className="text-xs text-orange-600 mt-0.5">Duplicados</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{rmResultado.errores.filter(e => !e.includes('omitido')).length}</p>
                    <p className="text-xs text-red-600 mt-0.5">Errores</p>
                  </div>
                </div>
                {rmResultado.errores.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-orange-500" />Detalle de filas con problemas:</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                      {rmResultado.errores.map((e, i) => (
                        <p key={i} className={`text-xs ${e.includes('omitido') ? 'text-orange-600' : 'text-red-600'}`}>• {e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
};

export default AdminPanelComponent;