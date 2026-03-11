import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calendar, DollarSign, CheckCircle, Clock, Edit, Trash2, Plus, Download } from 'lucide-react';
import Config from '../utils/Config.js';
import Modal from './Modal.jsx';

const ModalParticipaciones = ({ isOpen, onClose, user = null }) => {
  const [participaciones, setParticipaciones] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => { if (isOpen && user) { cargarParticipaciones(); cargarEventos(); } }, [isOpen, user]);

  const cargarParticipaciones = async () => {
    try {
      setLoading(true); setError(null);
      const { user: admin } = JSON.parse(localStorage.getItem('adminSession'));
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'obtener_participaciones_usuario', admin_user_id: admin.id, user_id: user.id }),
      });
      const data = await response.json();
      if (data.success) setParticipaciones(data.participaciones);
      else setError(data.message || 'Error al cargar participaciones');
    } catch { setError('Error de conexión al cargar participaciones'); }
    finally { setLoading(false); }
  };

  const cargarEventos = async () => {
    try {
      const { user: admin } = JSON.parse(localStorage.getItem('adminSession'));
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'obtener_eventos', admin_user_id: admin.id, pagina: 1, por_pagina: 100 }),
      });
      const data = await response.json();
      if (data.success) setEventos(data.eventos);
    } catch { /* silencioso, el select quedará vacío */ }
  };

  const getAdminId = () => JSON.parse(localStorage.getItem('adminSession')).user.id;

  const handleDescargar = (p) => {
    const url = `${Config.getDownloadUrl()}?userId=${user.id}&certificateId=${encodeURIComponent(p.nro_certificado)}&eventoId=${p.evento_id}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descargando certificado...');
  };

  const estadoColor = (e) => e === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
  const estadoIcon  = (e) => e === 'pagado' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
  const estadoTexto = (e) => e === 'pagado' ? 'Pagado' : 'Pendiente';

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar_participacion', admin_user_id: getAdminId(), participacion_id: editando.id, nro_certificado: fd.get('nro_certificado'), estado_pago: fd.get('estado_pago') }),
      });
      const data = await response.json();
      if (data.success) { await cargarParticipaciones(); setEditando(null); toast.success('Participación actualizada correctamente'); }
      else { toast.error(data.message || 'Error al actualizar'); throw new Error(data.message); }
    } catch { toast.error('Error al actualizar participación'); }
  };

  const handleConfirmarEliminacion = async () => {
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar_participacion', admin_user_id: getAdminId(), participacion_id: eliminando.id }),
      });
      const data = await response.json();
      if (data.success) { await cargarParticipaciones(); setEliminando(null); toast.success('Participación eliminada correctamente'); }
      else { toast.error(data.message || 'Error al eliminar'); throw new Error(data.message); }
    } catch { toast.error('Error al eliminar participación'); }
  };

  const handleGuardarNueva = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'agregar_participacion', admin_user_id: getAdminId(), user_id: user.id, evento_id: fd.get('evento_id'), nro_certificado: fd.get('nro_certificado'), estado_pago: fd.get('estado_pago') }),
      });
      const data = await response.json();
      if (data.success) { await cargarParticipaciones(); setAgregando(false); toast.success('Participación agregada correctamente'); }
      else { toast.error(data.message || 'Error al agregar'); throw new Error(data.message); }
    } catch { toast.error('Error al agregar participación'); }
  };

  // Botón "Agregar" que vive en el header del modal principal
  const headerAction = (
    <button onClick={() => setAgregando(true)} className="flex items-center space-x-2 bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer text-sm">
      <Plus className="w-4 h-4" /><span>Agregar Participación</span>
    </button>
  );

  return (
    <>
      {/* ── Modal principal: lista de participaciones ── */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Participaciones del Usuario"
        icon={<Calendar className="w-6 h-6 text-green-600" />}
        iconBg="bg-green-100"
        maxWidth="max-w-4xl"
        scrollable
        titleAction={headerAction}
      >
        {/* Sub-título con nombre del usuario */}
        <p className="text-sm text-gray-500 -mt-2 mb-4">{user?.nombre} {user?.apellido} ({user?.usuario})</p>

        {loading ? (
          <div className="flex items-center justify-center py-12 space-x-3">
            <svg className="animate-spin h-6 w-6 text-[#cf152d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <span className="text-gray-600">Cargando participaciones...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <button onClick={cargarParticipaciones} className="mt-4 bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">Reintentar</button>
          </div>
        ) : participaciones.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Sin participaciones</h3>
            <p className="mt-1 text-sm text-gray-500">Este usuario no tiene participaciones registradas en eventos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Participaciones ({participaciones.length})</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1"><CheckCircle className="w-4 h-4 text-green-600" /><span>Pagado</span></span>
                <span className="flex items-center space-x-1"><Clock className="w-4 h-4 text-orange-600" /><span>Pendiente</span></span>
              </div>
            </div>
            <div className="grid gap-4">
              {participaciones.map((p) => (
                <div key={p.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-[#cf152d]/10 rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-[#cf152d]" /></div>
                      <h5 className="font-medium text-gray-900">{p.nombre_evento}</h5>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-600">Nro. Certificado:</span><span className="ml-2 font-medium text-gray-900">{p.nro_certificado}</span></div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor(p.estado_pago)}`}>{estadoIcon(p.estado_pago)}{estadoTexto(p.estado_pago)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <span className={`flex items-center space-x-1 text-sm font-medium ${p.estado_pago === 'pagado' ? 'text-green-600' : 'text-orange-600'}`}>
                      {p.estado_pago === 'pagado' ? <CheckCircle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      <span>{p.estado_pago === 'pagado' ? 'Disponible' : 'Pago pendiente'}</span>
                    </span>
                    {p.estado_pago === 'pagado' && (
                      <button
                        onClick={() => handleDescargar(p)}
                        title="Descargar certificado"
                        className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-50 cursor-pointer"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    <button onClick={() => setEditando(p)} className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 cursor-pointer"><Edit size={16} /></button>
                    <button onClick={() => setEliminando(p)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 cursor-pointer"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal editar participación ── */}
      <Modal isOpen={!!editando} onClose={() => setEditando(null)} title="Editar Participación" icon={<Edit className="w-6 h-6 text-blue-600" />} iconBg="bg-blue-100" zIndex="z-[60]">
        <form onSubmit={handleGuardarEdicion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evento</label>
            <input type="text" value={editando?.nombre_evento || ''} disabled className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de Certificado</label>
            <input type="text" name="nro_certificado" defaultValue={editando?.nro_certificado} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" placeholder="Ingresa el número de certificado" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Pago</label>
            <select name="estado_pago" defaultValue={editando?.estado_pago} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" required>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={() => setEditando(null)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-[#cf152d] text-white rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal confirmar eliminación ── */}
      <Modal isOpen={!!eliminando} onClose={() => setEliminando(null)} title="Eliminar Participación" icon={<Trash2 className="w-6 h-6 text-red-600" />} iconBg="bg-red-100" zIndex="z-[60]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-red-600" /></div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">¿Eliminar participación?</h4>
          <p className="text-gray-600 mb-6">¿Estás seguro de eliminar la participación en <span className="font-semibold">{eliminando?.nombre_evento}</span>? Esta acción no se puede deshacer.</p>
          <div className="flex space-x-3">
            <button onClick={() => setEliminando(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
            <button onClick={handleConfirmarEliminacion} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer">Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal agregar participación ── */}
      <Modal isOpen={agregando} onClose={() => setAgregando(false)} title="Agregar Participación" icon={<Plus className="w-6 h-6 text-[#cf152d]" />} zIndex="z-[60]">
        <form onSubmit={handleGuardarNueva} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <input type="text" value={`${user?.nombre} ${user?.apellido} (${user?.usuario})`} disabled className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evento</label>
            <select name="evento_id" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" required>
              <option value="">Selecciona un evento</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.nombre_evento}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número de Certificado</label>
            <input type="text" name="nro_certificado" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" placeholder="Ingresa el número de certificado" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Pago</label>
            <select name="estado_pago" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" required>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={() => setAgregando(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-[#cf152d] text-white rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer">Agregar Participación</button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ModalParticipaciones;