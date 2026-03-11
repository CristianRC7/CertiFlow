import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2, MapPin, Save, MousePointer, CheckCircle, AlertTriangle, X, Eye } from 'lucide-react';
import Config from '../utils/Config.js';

// ── Definición de campos disponibles ─────────────────────────────────────────
const CAMPOS_DISPONIBLES = [
  { value: 'nombre_apellido', label: 'Nombre Apellido',  ejemplo: 'CRISTIAN DAVID',   color: '#cf152d' },
  { value: 'apellido_nombre', label: 'Apellido Nombre',  ejemplo: 'RAMIREZ CALLEJAS',   color: '#2563eb' },
  { value: 'nro_certificado', label: 'Nro. Certificado', ejemplo: 'JETS2025-001', color: '#16a34a' },
];

const FONT_STYLES = [
  { value: 'B',  label: 'Negrita' },
  { value: '',   label: 'Normal'  },
  { value: 'I',  label: 'Cursiva' },
  { value: 'BI', label: 'Negrita + Cursiva' },
];

// Valores de ejemplo para el preview
const PREVIEW_VALUES = {
  nombre_apellido: 'CRISTIAN DAVID RAMIREZ CALLEJAS',
  apellido_nombre: 'RAMIREZ CALLEJAS CRISTIAN DAVID',
  nro_certificado: 'Nro* 1234',
};

// Convierte font_style al objeto CSS correspondiente
const fontStyleToCSS = (style) => ({
  fontWeight: (style === 'B' || style === 'BI') ? 700 : 400,
  fontStyle:  (style === 'I' || style === 'BI') ? 'italic' : 'normal',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const getCampoColor = (campo) => CAMPOS_DISPONIBLES.find(c => c.value === campo)?.color || '#666';
const getCampoEjemplo = (campo) => CAMPOS_DISPONIBLES.find(c => c.value === campo)?.ejemplo || campo;
const getCampoLabel  = (campo) => CAMPOS_DISPONIBLES.find(c => c.value === campo)?.label  || campo;

// ── Componente principal ──────────────────────────────────────────────────────
const ModalPosicionCampos = ({ isOpen, onClose, evento = null, onGuardado }) => {
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [campos,            setCampos]            = useState([]);
  const [camposOriginales,  setCamposOriginales]  = useState([]);
  const [campoPendiente,    setCampoPendiente]    = useState(null);
  const [fontSize,          setFontSize]          = useState(20);
  const [fontStyle,         setFontStyle]         = useState('B');
  const [imgError,          setImgError]          = useState(false);
  const [imgCargada,        setImgCargada]        = useState(false);
  const [showPreview,       setShowPreview]       = useState(false);
  const [previewImgWidth,   setPreviewImgWidth]   = useState(0);
  const [editacionReal,     setEditacionReal]     = useState(false);
  const [mainImgWidth,      setMainImgWidth]      = useState(0);
  const containerRef   = useRef(null);
  const previewImgRef  = useRef(null);

  const getAdminId = () => JSON.parse(localStorage.getItem('adminSession')).user.id;

  // ── Cargar campos existentes al abrir ────────────────────────────────────
  useEffect(() => {
    if (isOpen && evento) {
      setImgError(false);
      setImgCargada(false);
      setCampoPendiente(null);
      cargarCampos();
    } else {
      setCampos([]);
      setCamposOriginales([]);
      setCampoPendiente(null);
    }
  }, [isOpen, evento]);

  // Actualizar mainImgWidth al redimensionar ventana (solo en edición real)
  useEffect(() => {
    if (!editacionReal) return;
    const onResize = () => { if (containerRef.current) setMainImgWidth(containerRef.current.offsetWidth); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [editacionReal]);

  const cargarCampos = async () => {
    try {
      setLoading(true);
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'obtener_campos_evento',
          admin_user_id: getAdminId(),
          evento_id: evento.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const loaded = (data.campos || []).map(c => ({
          ...c,
          x_pct:      parseFloat(c.x_pct),
          y_pct:      parseFloat(c.y_pct),
          font_size:  parseInt(c.font_size, 10),
          font_style: c.font_style,
        }));
        setCampos(loaded);
        setCamposOriginales(loaded.map(c => c.campo));
      } else {
        toast.error(data.message || 'Error al cargar campos');
      }
    } catch {
      toast.error('Error de conexión al cargar campos');
    } finally {
      setLoading(false);
    }
  };

  // ── Click en la imagen ────────────────────────────────────────────────────
  const handleContainerClick = useCallback((e) => {
    if (!campoPendiente || !imgCargada) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left)  / rect.width  * 100).toFixed(3));
    const y = parseFloat(((e.clientY - rect.top)   / rect.height * 100).toFixed(3));

    setCampos(prev => {
      const sinEste = prev.filter(c => c.campo !== campoPendiente);
      return [...sinEste, {
        campo:      campoPendiente,
        x_pct:      x,
        y_pct:      y,
        font_size:  fontSize,
        font_style: fontStyle,
      }];
    });
    setCampoPendiente(null);
    toast.success(`"${getCampoLabel(campoPendiente)}" colocado en (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
  }, [campoPendiente, fontSize, fontStyle, imgCargada]);

  // ── Seleccionar campo (toggle) ────────────────────────────────────────────
  const handleSeleccionarCampo = (nombreCampo) => {
    if (!evento?.imagen_certificado) {
      toast.error('Este evento no tiene imagen. Sube la imagen primero.');
      return;
    }
    // Si ya hay un marcador, cargar sus ajustes actuales al seleccionarlo
    const existente = campos.find(c => c.campo === nombreCampo);
    if (existente) {
      setFontSize(existente.font_size);
      setFontStyle(existente.font_style);
    }
    setCampoPendiente(prev => prev === nombreCampo ? null : nombreCampo);
  };

  // ── Actualizar solo fuente de un campo ya colocado ───────────────────────
  const handleActualizarFuente = () => {
    if (!campoPendiente) return;
    const existente = campos.find(c => c.campo === campoPendiente);
    if (!existente) return;
    setCampos(prev => prev.map(c =>
      c.campo === campoPendiente
        ? { ...c, font_size: fontSize, font_style: fontStyle }
        : c
    ));
    toast.success(`Fuente de "${getCampoLabel(campoPendiente)}" actualizada`);
  };

  // ── Eliminar un campo ─────────────────────────────────────────────────────
  const handleEliminarCampo = (nombreCampo) => {
    setCampos(prev => prev.filter(c => c.campo !== nombreCampo));
    if (campoPendiente === nombreCampo) setCampoPendiente(null);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (campos.length === 0) {
      toast.error('Coloca al menos un campo en el certificado antes de guardar');
      return;
    }
    try {
      setSaving(true);

      // 1. Borrar campos eliminados del servidor
      const camposAEliminar = camposOriginales.filter(c => !campos.find(x => x.campo === c));
      for (const campo of camposAEliminar) {
        await fetch(Config.getAdminUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'eliminar_campo_evento',
            admin_user_id: getAdminId(),
            evento_id: evento.id,
            campo,
          }),
        });
      }

      // 2. Upsert de todos los campos actuales
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardar_campos_evento',
          admin_user_id: getAdminId(),
          evento_id: evento.id,
          campos,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campos guardados correctamente');
        onGuardado?.();
        onClose();
      } else {
        toast.error(data.message || 'Error al guardar campos');
      }
    } catch {
      toast.error('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const imageUrl = evento?.imagen_certificado
    ? Config.getCertificatesImageUrl(evento.imagen_certificado)
    : null;

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-auto max-h-[95vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#cf152d] rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configurar Campos del Certificado</h3>
              <p className="text-sm text-gray-500">{evento?.nombre_evento}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel izquierdo: controles */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* Instrucción principal */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-medium mb-1">¿Cómo usar?</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Selecciona un campo de abajo</li>
                  <li>Ajusta tamaño y estilo</li>
                  <li>Haz clic en la imagen donde quieres colocarlo</li>
                  <li>Repite para cada campo</li>
                  <li>Guarda cuando termines</li>
                </ol>
              </div>

              {/* Selección de campo */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Campo a colocar</p>
                <div className="space-y-2">
                  {CAMPOS_DISPONIBLES.map((def) => {
                    const yaColocado = campos.find(c => c.campo === def.value);
                    const esPendiente = campoPendiente === def.value;
                    return (
                      <button
                        key={def.value}
                        onClick={() => handleSeleccionarCampo(def.value)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                          esPendiente
                            ? 'border-[#cf152d] bg-[#cf152d]/5'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: def.color }}
                            />
                            <span className="text-sm font-medium text-gray-800">{def.label}</span>
                          </div>
                          {yaColocado && (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: def.color }} />
                          )}
                          {esPendiente && (
                            <span className="text-xs text-[#cf152d] font-bold">← clic</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-5">ej: {def.ejemplo}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuración de fuente */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Configuración de texto</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tamaño de fuente (pt)</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setFontSize(s => Math.max(6, s - 1))}
                        className="w-8 h-8 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 cursor-pointer text-sm font-bold"
                      >−</button>
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(Math.max(6, Math.min(100, parseInt(e.target.value) || 20)))}
                        className="flex-1 text-center border border-gray-300 rounded py-1 text-sm focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d]"
                        min={6} max={100}
                      />
                      <button
                        onClick={() => setFontSize(s => Math.min(100, s + 1))}
                        className="w-8 h-8 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 cursor-pointer text-sm font-bold"
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Estilo de fuente</label>
                    <select
                      value={fontStyle}
                      onChange={(e) => setFontStyle(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d]"
                    >
                      {FONT_STYLES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Botón actualizar — solo visible si el campo ya está colocado */}
                  {campoPendiente && campos.find(c => c.campo === campoPendiente) && (
                    <button
                      onClick={handleActualizarFuente}
                      className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Aplicar tamaño y estilo</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  * Para campos ya colocados: cambia los valores y pulsa "Aplicar". Para mover un campo: selecciónalo y haz clic en la imagen.
                </p>
              </div>

              {/* Campos colocados */}
              {campos.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Campos colocados ({campos.length})</p>
                  <div className="space-y-2">
                    {campos.map((c) => {
                      const def = CAMPOS_DISPONIBLES.find(d => d.value === c.campo);
                      return (
                        <div
                          key={c.campo}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: def?.color }} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{def?.label}</p>
                              <p className="text-xs text-gray-400">
                                x:{c.x_pct.toFixed(1)}% y:{c.y_pct.toFixed(1)}% · {c.font_size}pt
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {/* Botón reposicionar */}
                            <button
                              onClick={() => handleSeleccionarCampo(c.campo)}
                              title="Reposicionar"
                              className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <MousePointer className="w-3.5 h-3.5" />
                            </button>
                            {/* Botón eliminar */}
                            <button
                              onClick={() => handleEliminarCampo(c.campo)}
                              title="Eliminar"
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Switch Edición Real */}
            {campos.length > 0 && evento?.imagen_certificado && (
              <div className="border-t border-gray-100 pt-4 px-5 pb-0">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Activar Edición Real</p>
                    <p className="text-xs text-amber-600 mt-0.5">Muestra el valor real en la imagen</p>
                  </div>
                  <button
                    onClick={() => setEditacionReal(v => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${editacionReal ? 'bg-amber-500' : 'bg-gray-300'}`}
                    role="switch"
                    aria-checked={editacionReal}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${editacionReal ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Botones de acción — fijos al fondo */}
            <div className="mt-auto p-5 border-t border-gray-200 space-y-2">
              <button
                onClick={handleGuardar}
                disabled={saving || campos.length === 0}
                className="w-full flex items-center justify-center space-x-2 bg-[#cf152d] text-white px-4 py-2.5 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Guardando...</span></>
                  : <><Save className="w-4 h-4" /><span>Guardar Campos</span></>
                }
              </button>
              {/* Botón Preview — solo si hay campos colocados e imagen */}
              {campos.length > 0 && evento?.imagen_certificado && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>Vista Previa</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Panel derecho: imagen con marcadores */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Barra de estado */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              {campoPendiente ? (
                <div className="flex items-center space-x-2 text-[#cf152d]">
                  <MousePointer className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Haz clic en la imagen para colocar: <strong>{getCampoLabel(campoPendiente)}</strong>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Selecciona un campo en el panel izquierdo y haz clic en la imagen</p>
              )}
              {!evento?.imagen_certificado && (
                <div className="flex items-center space-x-1 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">Sin imagen — sube la imagen del certificado primero</span>
                </div>
              )}
            </div>

            {/* Área de la imagen */}
            <div className="flex-1 overflow-auto p-5 flex items-start justify-center bg-gray-100">
              {loading ? (
                <div className="flex items-center space-x-3 mt-20">
                  <svg className="animate-spin h-6 w-6 text-[#cf152d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-gray-600">Cargando...</span>
                </div>
              ) : !evento?.imagen_certificado ? (
                <div className="text-center mt-20">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Sin imagen</p>
                  <p className="text-gray-400 text-sm mt-1">Agrega la imagen del certificado desde la tabla de eventos</p>
                </div>
              ) : imgError ? (
                <div className="text-center mt-20">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-500 font-medium">No se pudo cargar la imagen</p>
                  <p className="text-gray-400 text-sm mt-1">Verifica que el archivo exista en el servidor</p>
                </div>
              ) : (
                <div className="w-full max-w-3xl">
                  {/* Contenedor de imagen con marcadores */}
                  <div
                    ref={containerRef}
                    onClick={handleContainerClick}
                    className="relative shadow-lg rounded overflow-hidden"
                    style={{ cursor: campoPendiente ? 'crosshair' : 'default' }}
                  >
                    <img
                      src={imageUrl}
                      alt="Certificado"
                      className="w-full h-auto block select-none"
                      draggable={false}
                      onLoad={() => { setImgCargada(true); if (containerRef.current) setMainImgWidth(containerRef.current.offsetWidth); }}
                      onError={() => setImgError(true)}
                    />

                    {/* Overlay de instrucción cuando hay campo pendiente */}
                    {campoPendiente && imgCargada && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'rgba(207,21,45,0.04)',
                          border: '2px dashed rgba(207,21,45,0.5)',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}

                    {/* Marcadores */}
                    {imgCargada && campos.map((c) => {
                      const def = CAMPOS_DISPONIBLES.find(d => d.value === c.campo);

                      if (editacionReal) {
                        // Modo edición real: texto con el valor de ejemplo escalado
                        const originalW = parseInt(evento?.imagen_width || 0, 10);
                        const valorTexto = PREVIEW_VALUES[c.campo] ?? c.campo;
                        const cssFont = fontStyleToCSS(c.font_style);
                        const fontSizePx = originalW > 0 && mainImgWidth > 0
                          ? c.font_size * (4 / 3) * (mainImgWidth / originalW)
                          : c.font_size * (4 / 3);
                        return (
                          <div
                            key={c.campo}
                            style={{
                              position: 'absolute',
                              left: `${c.x_pct}%`,
                              top: `${c.y_pct}%`,
                              transform: 'translate(-50%, -50%)',
                              fontSize: `${fontSizePx}px`,
                              fontFamily: 'Helvetica, Arial, sans-serif',
                              fontWeight: cssFont.fontWeight,
                              fontStyle: cssFont.fontStyle,
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              pointerEvents: 'none',
                              textShadow: '0 0 3px rgba(255,255,255,0.5)',
                              lineHeight: 1,
                              zIndex: 10,
                            }}
                          >
                            {valorTexto}
                          </div>
                        );
                      }

                      // Modo normal: etiqueta coloreada con pin
                      const color = def?.color || '#666';
                      const etiqueta = `${def?.ejemplo || c.campo} (${c.font_size}pt)`;
                      return (
                        <div
                          key={c.campo}
                          style={{
                            position: 'absolute',
                            left: `${c.x_pct}%`,
                            top: `${c.y_pct}%`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}
                        >
                          {/* Etiqueta */}
                          <div
                            style={{
                              backgroundColor: color,
                              borderRadius: '4px',
                              padding: '2px 7px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            }}
                          >
                            <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>
                              {etiqueta}
                            </span>
                          </div>
                          {/* Pin */}
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: '6px solid transparent',
                              borderRight: '6px solid transparent',
                              borderTop: `8px solid ${color}`,
                              margin: '0 auto',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Leyenda */}
                  {campos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {campos.map(c => {
                        const def = CAMPOS_DISPONIBLES.find(d => d.value === c.campo);
                        return (
                          <div key={c.campo} className="flex items-center space-x-1.5">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: def?.color }} />
                            <span className="text-xs text-gray-600">{def?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Preview overlay — z-[60] para quedar encima del modal principal */}
    <PreviewOverlay
      show={showPreview}
      onClose={() => setShowPreview(false)}
      imageUrl={imageUrl}
      campos={campos}
      evento={evento}
    />
    </>
  );
};


/* ── Overlay de Vista Previa ──────────────────────────────────────────────── */
const PreviewOverlay = ({ show, onClose, imageUrl, campos, evento }) => {
  const [imgWidth, setImgWidth] = useState(0);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const onResize = () => { if (imgRef.current) setImgWidth(imgRef.current.offsetWidth); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [show]);

  if (!show) return null;

  const originalW = parseInt(evento?.imagen_width || 0, 10);

  const handleImgLoad = () => {
    if (imgRef.current) setImgWidth(imgRef.current.offsetWidth);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[60] p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-indigo-600 text-white">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span className="font-semibold">Vista Previa — {evento?.nombre_evento}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-indigo-200 hidden sm:block">
              Ejemplo: Cristian David Ramirez Callejas · Nro* 1234
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Imagen con textos superpuestos */}
        <div className="relative" style={{ lineHeight: 0 }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Preview certificado"
            className="w-full h-auto block select-none"
            draggable={false}
            onLoad={handleImgLoad}
          />

          {imgWidth > 0 && originalW > 0 && campos.map((c) => {
            const texto      = PREVIEW_VALUES[c.campo] ?? c.campo;
            const cssFont    = fontStyleToCSS(c.font_style);
            // Escala exacta: pt → px relativo al ancho renderizado en pantalla
            const fontSizePx = c.font_size * (4 / 3) * (imgWidth / originalW);

            return (
              <div
                key={c.campo}
                style={{
                  position:   'absolute',
                  left:       `${c.x_pct}%`,
                  top:        `${c.y_pct}%`,
                  transform:  'translate(-50%, -50%)',
                  fontSize:   `${fontSizePx}px`,
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  fontWeight: cssFont.fontWeight,
                  fontStyle:  cssFont.fontStyle,
                  color:      '#000000',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  textShadow: '0 0 3px rgba(255,255,255,0.5)',
                  lineHeight: 1,
                }}
              >
                {texto}
              </div>
            );
          })}
        </div>

        {/* Pie con resumen de campos */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            {campos.map(c => {
              const def = CAMPOS_DISPONIBLES.find(d => d.value === c.campo);
              return (
                <span key={c.campo} className="flex items-center space-x-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: def?.color }} />
                  <span className="font-medium">{def?.label}</span>
                  <span className="text-gray-400">·</span>
                  <span>{c.font_size}pt</span>
                  <span className="text-gray-400">·</span>
                  <span>{FONT_STYLES.find(f => f.value === c.font_style)?.label}</span>
                  <span className="text-gray-400">·</span>
                  <span>x:{c.x_pct.toFixed(1)}% y:{c.y_pct.toFixed(1)}%</span>
                </span>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * La posición es una aproximación visual. El PDF final puede diferir ligeramente según el motor de TCPDF.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModalPosicionCampos;