import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Config from '../utils/Config.js';
import { Edit, Trash2, Plus, Search, Eye, Image as ImageIcon, Calendar, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import ModalPosicionCampos from './ModalPosicionCampos.jsx';

const EventsPanelComponent = () => {
  const [eventos, setEventos] = useState([]);
  const [eventosFiltrados, setEventosFiltrados] = useState([]);
  const [totalEventos, setTotalEventos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina] = useState(15);
  const [totalPaginas, setTotalPaginas] = useState(0);

  // Modales existentes
  const [modalEvento, setModalEvento] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalImagen, setModalImagen] = useState(false);
  const [selectedImagen, setSelectedImagen] = useState('');

  // Modal campos (nuevo)
  const [modalCampos, setModalCampos] = useState(false);
  const [eventoParaCampos, setEventoParaCampos] = useState(null);

  // Archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => { cargarEventos(); }, []);
  useEffect(() => { filtrarEventos(); }, [eventos, busqueda]);

  const cargarEventos = async (pagina = paginaActual) => {
    try {
      setLoading(true);
      const { user } = JSON.parse(localStorage.getItem('adminSession') || '{}');
      if (!user) { setError('No hay sesión de administrador'); return; }
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'obtener_eventos', admin_user_id: user.id, pagina, por_pagina: porPagina }),
      });
      const data = await response.json();
      if (data.success) {
        setEventos(data.eventos);
        setTotalEventos(data.total);
        setPaginaActual(data.pagina_actual);
        setTotalPaginas(data.total_paginas);
      } else setError(data.message || 'Error al cargar eventos');
    } catch { setError('Error de conexión al cargar eventos'); }
    finally { setLoading(false); }
  };

  const filtrarEventos = () => {
    setEventosFiltrados(busqueda.trim()
      ? eventos.filter((e) => e.nombre_evento.toLowerCase().includes(busqueda.toLowerCase()))
      : eventos);
  };

  const getAdminId = () => JSON.parse(localStorage.getItem('adminSession')).user.id;

  // ── Handlers de modales ────────────────────────────────────────────────────
  const openEventoModal   = (mode, event = null) => { setModalMode(mode); setSelectedEvent(event); setSelectedFile(null); setFileName(''); setModalEvento(true); };
  const closeEventoModal  = () => { setModalEvento(false); setSelectedEvent(null); setSelectedFile(null); setFileName(''); };
  const openImagen        = (evento) => { setSelectedImagen(Config.getCertificatesImageUrl(evento.imagen_certificado)); setModalImagen(true); };
  const openCamposModal   = (evento) => { setEventoParaCampos(evento); setModalCampos(true); };
  const closeCamposModal  = () => { setModalCampos(false); setEventoParaCampos(null); };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { toast.error('Solo se permiten archivos PNG y JPG'); event.target.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('El archivo es demasiado grande. Máximo 15MB'); event.target.value = ''; return; }
    setSelectedFile(file); setFileName(file.name);
  };

  const handleCambiarPagina = (p) => { if (p >= 1 && p <= totalPaginas) { setPaginaActual(p); cargarEventos(p); } };

  const handleDeleteImage = async (evento) => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_imagen_evento', admin_user_id: getAdminId(), evento_id: evento.id }),
      });
      const data = await response.json();
      if (data.success) { await cargarEventos(); toast.success(data.message || 'Imagen eliminada correctamente'); }
      else { toast.error(data.message || 'Error al eliminar imagen'); throw new Error(data.message); }
    } catch { toast.error('Error al eliminar imagen'); }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    const nombre_evento = new FormData(e.target).get('nombre_evento');
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('action', modalMode === 'add' ? 'agregar_evento' : 'editar_evento');
      formDataToSend.append('admin_user_id', getAdminId());
      formDataToSend.append('evento_data[nombre_evento]', nombre_evento);
      if (modalMode === 'edit') formDataToSend.append('evento_id', selectedEvent.id);
      if (selectedFile instanceof File) formDataToSend.append('imagen', selectedFile);
      const response = await fetch(Config.getAdminUrl(), { method: 'POST', body: formDataToSend });
      const data = await response.json();
      if (data.success) {
        await cargarEventos();
        toast.success(data.message || 'Evento guardado correctamente');
        closeEventoModal();
        // Si se subió una imagen nueva, sugerir configurar campos
        if (selectedFile && modalMode === 'add') {
          toast.info('¡Imagen subida! Ahora configura las posiciones de los campos en el certificado.');
        }
        if (data.imagen_cambiada) {
          toast.warning('La imagen cambió — recuerda reconfigurar las posiciones de los campos.');
        }
      } else { toast.error(data.message || 'Error al guardar evento'); throw new Error(data.message); }
    } catch { toast.error('Error al guardar evento'); }
  };

  const handleDeleteEvent = async () => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_evento', admin_user_id: getAdminId(), evento_id: selectedEvent.id }),
      });
      const data = await response.json();
      if (data.success) { await cargarEventos(); toast.success(data.message || 'Evento eliminado correctamente'); closeEventoModal(); }
      else { toast.error(data.message || 'Error al eliminar evento'); throw new Error(data.message); }
    } catch { toast.error('Error al eliminar evento'); }
  };

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

  if (loading) return (
    <div className="bg-gray-50 flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg flex items-center space-x-3">
        <svg className="animate-spin h-6 w-6 text-[#cf152d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        <span className="text-gray-600">Cargando eventos...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-gray-50 flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button onClick={cargarEventos} className="mt-4 bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">Reintentar</button>
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
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Eventos</p>
                <p className="text-2xl font-semibold text-gray-900">{totalEventos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Eventos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => openEventoModal('add')} className="bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer flex items-center space-x-2">
                  <Plus size={16} /><span>Agregar Evento</span>
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Buscar eventos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 text-sm" />
                </div>
                <span className="text-sm text-gray-500">({eventosFiltrados.length} de {totalEventos})</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Evento', 'Imagen', 'Campos', 'Acciones'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventosFiltrados.map((ev) => {
                  const camposConfigurados = parseInt(ev.campos_configurados || 0, 10);
                  const tieneImagen = !!ev.imagen_certificado;
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">

                      {/* Nombre */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ev.nombre_evento}
                      </td>

                      {/* Imagen */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tieneImagen ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon size={16} className="text-gray-500" />
                            </div>
                            <span className="text-sm text-gray-600 max-w-[160px] truncate" title={ev.imagen_certificado}>
                              {ev.imagen_certificado}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin imagen</span>
                        )}
                      </td>

                      {/* Columna Campos — estado de configuración */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!tieneImagen ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : camposConfigurados > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>{camposConfigurados} campo{camposConfigurados !== 1 ? 's' : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Sin configurar</span>
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {tieneImagen && (
                            <>
                              {/* Ver imagen */}
                              <button
                                onClick={() => openImagen(ev)}
                                className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-50 cursor-pointer"
                                title="Ver imagen"
                              >
                                <Eye size={18} />
                              </button>

                              {/* Configurar campos */}
                              <button
                                onClick={() => openCamposModal(ev)}
                                className={`p-1 rounded-md cursor-pointer transition-colors ${
                                  camposConfigurados > 0
                                    ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                                    : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                }`}
                                title={camposConfigurados > 0 ? 'Editar posición de campos' : 'Configurar posición de campos'}
                              >
                                <Settings size={18} />
                              </button>

                              {/* Eliminar imagen */}
                              <button
                                onClick={() => handleDeleteImage(ev)}
                                className="text-orange-600 hover:text-orange-800 p-1 rounded-md hover:bg-orange-50 cursor-pointer"
                                title="Eliminar imagen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}

                          {/* Editar evento */}
                          <button
                            onClick={() => openEventoModal('edit', ev)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>

                          {/* Eliminar evento */}
                          <button
                            onClick={() => openEventoModal('delete', ev)}
                            className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {eventosFiltrados.length === 0 && (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron eventos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {busqueda ? `No hay eventos que coincidan con "${busqueda}".` : 'No hay eventos registrados en el sistema.'}
              </p>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{((paginaActual - 1) * porPagina) + 1}</span> a{' '}
                <span className="font-medium">{Math.min(paginaActual * porPagina, totalEventos)}</span> de{' '}
                <span className="font-medium">{totalEventos}</span>
              </div>
              <div className="flex space-x-1">{generarBotonesPaginacion()}</div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal agregar / editar / eliminar evento ── */}
      <Modal
        isOpen={modalEvento}
        onClose={closeEventoModal}
        title={modalMode === 'add' ? 'Agregar Evento' : modalMode === 'edit' ? 'Editar Evento' : 'Eliminar Evento'}
        icon={<Calendar className={`w-6 h-6 ${modalMode === 'delete' ? 'text-red-600' : 'text-white'}`} />}
        iconBg={modalMode === 'delete' ? 'bg-red-100' : 'bg-[#cf152d]'}
      >
        {modalMode === 'delete' ? (
          <div className="text-center space-y-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">¿Eliminar evento?</h3>
            <p className="text-sm text-gray-500">
              ¿Estás seguro de que quieres eliminar el evento "<strong>{selectedEvent?.nombre_evento}</strong>"? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3 pt-2">
              <button onClick={closeEventoModal} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
              <button onClick={handleDeleteEvent} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer">Eliminar</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Evento</label>
              <input
                type="text"
                name="nombre_evento"
                defaultValue={selectedEvent?.nombre_evento || ''}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200"
                placeholder="Ej: JETS 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Certificado</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200"
              />
              {fileName && (
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg mt-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700">{fileName}</span>
                </div>
              )}
              {selectedEvent?.imagen_certificado && !fileName && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg mt-2">
                  <span className="text-sm text-blue-700">Imagen actual: {selectedEvent.imagen_certificado}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(selectedEvent)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              )}
              {selectedEvent?.imagen_certificado && fileName && (
                <div className="flex items-center space-x-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-700">
                    Al cambiar la imagen, las posiciones de campos configuradas se eliminarán y deberás reconfigurarlas.
                  </span>
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500">Solo PNG y JPG. Máximo 15MB.</p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={closeEventoModal} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" className="flex-1 px-4 py-3 bg-[#cf152d] text-white rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">
                {modalMode === 'add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal ver imagen ── */}
      <Modal
        isOpen={modalImagen}
        onClose={() => setModalImagen(false)}
        title="Vista Previa de Imagen"
        icon={<ImageIcon className="w-6 h-6 text-blue-600" />}
        iconBg="bg-blue-100"
        maxWidth="max-w-4xl"
      >
        <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={selectedImagen}
            alt="Certificado"
            className="max-w-full max-h-full object-contain rounded-lg"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div style={{ display: 'none' }} className="flex-col items-center justify-center p-4">
            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No se pudo cargar la imagen</p>
          </div>
        </div>
      </Modal>

      {/* ── Modal configurar posición de campos ── */}
      <ModalPosicionCampos
        isOpen={modalCampos}
        onClose={closeCamposModal}
        evento={eventoParaCampos}
        onGuardado={cargarEventos}
      />
    </div>
  );
};

export default EventsPanelComponent;