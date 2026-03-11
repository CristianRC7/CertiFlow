import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Eye, EyeOff, Download, AlertTriangle, Info, ShieldCheck, FileText } from 'lucide-react';
import Modal from './Modal.jsx';
import Config from '../utils/Config.js';

const _0x4e7c={_0xa2:"Q3Jpc3RpYW4gUmFtaXJleiB8IENURSA6RA==",_0xb5:"U2lzdGVtYSBkZSBDZXJ0aWZpY2Fkb3MgVVRFUFNB",_0xc8:"Y29sb3I6ICNjZjE1MmQ7IGZvbnQtd2VpZ2h0OiBib2xkOyBmb250LXNpemU6IDE2cHg7IGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7",_0xd1:"Y29sb3I6ICM2NjY7IGZvbnQtc3R5bGU6IGl0YWxpYzsgZm9udC1zaXplOiAxMXB4Ow=="};
const _0xd4=()=>{console.log("%c"+atob(_0x4e7c._0xa2)+"\n%c"+atob(_0x4e7c._0xb5),atob(_0x4e7c._0xc8),atob(_0x4e7c._0xd1));};
if(typeof window!=="undefined")window["_0xd4"]=_0xd4;

const LoginPage = () => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modales
  const [modalCerts, setModalCerts] = useState(false);
  const [modalAyuda, setModalAyuda] = useState(false);
  const [modalAdmin, setModalAdmin] = useState(false);

  // Datos
  const [certificados, setCertificados] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [usuarioId, setUsuarioId] = useState(null);
  const certPorPagina = 2;

  const [adminUserData, setAdminUserData] = useState(null);
  const [adminCode, setAdminCode] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const lottieRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lottie-web@5.12.2/build/player/lottie.min.js';
    script.onload = () => {
      if (lottieRef.current && window.lottie) {
        window.lottie.loadAnimation({ container: lottieRef.current, renderer: 'svg', loop: true, autoplay: true, path: '/animation/student.json' });
      }
    };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    _0xd4();
    if (!usuario || !contrasena) { toast.error('Por favor, completa todos los campos'); return; }
    setLoading(true);
    try {
      const response = await fetch(Config.getLoginUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const data = await response.json();
      if (data.success) {
        setUsuarioId(data.user.id);
        if (data.user.is_admin) { setAdminUserData(data.user); setModalAdmin(true); }
        else await obtenerCertificados(data.user.id);
      } else {
        const errores = {
          user_not_found: 'El usuario no existe. Verifica tu número de estudiante.',
          wrong_password: 'Contraseña incorrecta. Intenta nuevamente.',
          database_error: 'Error del servidor. Contacta al administrador.',
        };
        toast.error(errores[data.error_type] || data.message || 'Error al iniciar sesión');
      }
    } catch { toast.error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'); }
    finally { setLoading(false); }
  };

  // ── Certificados ─────────────────────────────────────────────────────────
  const obtenerCertificados = async (userId) => {
    try {
      const response = await fetch(Config.getCertificadosUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: userId }),
      });
      const data = await response.json();
      setCertificados(data.success && data.certificados?.length > 0 ? data.certificados : []);
      setPagina(1);
      setModalCerts(true);
    } catch { toast.error('Error al obtener certificados. Intenta nuevamente.'); }
  };

  const handleDescargar = async (nroCertificado, eventoId) => {
    const cert = certificados.find((c) => c.nro_certificado === nroCertificado && c.evento_id === eventoId);
    if (!cert) { toast.error('No se pudo obtener información del certificado'); return; }
    if (cert.estado_pago !== 'pagado') { toast.warning('Este certificado tiene pago pendiente. No se puede descargar.'); return; }
    toast.info('Generando certificado...');
    try {
      const response = await fetch(`${Config.getDownloadUrl()}?userId=${usuarioId}&certificateId=${nroCertificado}&eventoId=${eventoId}`);
      if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado_${cert.nombre_evento.replace(/\s+/g, '_')}_${nroCertificado}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Certificado del evento ${cert.nombre_evento} descargado exitosamente`);
    } catch (error) { toast.error(error.message || 'Error al descargar el certificado'); }
  };

  // ── Admin ─────────────────────────────────────────────────────────────────
  const handleVerificarAdmin = async (e) => {
    e.preventDefault();
    if (!adminCode) { toast.error('Por favor, ingresa el código de administrador'); return; }
    setAdminLoading(true);
    try {
      const response = await fetch(Config.getAdminUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verificar_codigo_admin', admin_user_id: adminUserData.id, codigo: adminCode }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Código verificado correctamente');
        setTimeout(() => {
          const sessionData = { user: adminUserData, isAdmin: true, adminVerified: true, timestamp: new Date().toISOString() };
          // Guardar en localStorage (para uso en React)
          localStorage.setItem('adminSession', JSON.stringify(sessionData));
          // ✅ Guardar también como cookie (para verificación server-side en Astro)
          document.cookie = `adminSession=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=86400; SameSite=Strict`;
          window.location.href = '/admin-panel';
        }, 1000);
      } else { toast.error(data.message || 'Código incorrecto'); setAdminCode(''); }
    } catch { toast.error('Error al verificar el código'); }
    finally { setAdminLoading(false); }
  };

  // ── Paginación ────────────────────────────────────────────────────────────
  const totalPaginas = Math.ceil(certificados.length / certPorPagina);
  const inicio = (pagina - 1) * certPorPagina;
  const certsPagina = certificados.slice(inicio, inicio + certPorPagina);

  return (
    <>
      <Toaster position="top-right" duration={4000} closeButton richColors expand theme="light" />

      {/* ── Tarjeta principal ── */}
      <div className="w-full max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* Lado izquierdo – animación */}
          <div className="bg-[#cf152d] p-6 lg:p-8 flex flex-col justify-center items-center relative min-h-[300px] lg:min-h-[600px]">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 text-center">
              <div ref={lottieRef} className="w-48 h-48 lg:w-64 lg:h-64 mx-auto mb-4" />
              <h2 className="text-xl lg:text-2xl font-bold text-white mt-6 text-center">Sistema de Certificados Digitales</h2>
            </div>
            <div className="absolute top-6 left-6 lg:top-10 lg:left-10 w-16 h-16 lg:w-20 lg:h-20 bg-white/10 rounded-full" />
            <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 w-24 h-24 lg:w-32 lg:h-32 bg-white/5 rounded-full" />
            <div className="absolute top-1/2 left-3 lg:left-5 w-12 h-12 lg:w-16 lg:h-16 bg-white/10 rounded-full" />
          </div>

          {/* Lado derecho – formulario */}
          <div className="p-6 lg:p-8 flex flex-col justify-center min-h-[400px] lg:min-h-[600px]">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#cf152d] mb-2">Iniciar Sesión</h1>
                <p className="text-gray-600 text-sm lg:text-base">Accede a tu cuenta para descargar tus certificados</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Usuario:</label>
                  <div className="relative">
                    <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 bg-white/80" placeholder="Ingresa tu usuario" />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña:</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 bg-white/80" placeholder="Ingresa tu contraseña" />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button type="button" onClick={() => setModalAyuda(true)} className="text-sm text-[#cf152d] hover:text-[#cf152d]/80 transition-colors cursor-pointer">
                    ¿Cómo puedo ingresar?
                  </button>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#cf152d] to-[#cf152d]/90 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:scale-100 flex items-center justify-center space-x-2">
                  {loading ? (
                    <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Iniciando sesión...</span></>
                  ) : <span>Iniciar Sesión</span>}
                </button>
              </form>

              <div className="text-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs lg:text-sm text-gray-500">© 2025 Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Mis Certificados ── */}
      <Modal
        isOpen={modalCerts}
        onClose={() => setModalCerts(false)}
        title="Mis Certificados"
        icon={<FileText className="w-6 h-6 text-[#cf152d]" />}
        maxWidth="max-w-2xl"
        backdrop="bg-white/30"
        zIndex="z-[9999]"
      >
        {certificados.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-gray-600">No se encuentra con certificados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {certsPagina.map((cert) => (
              <div key={cert.nro_certificado} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-[#cf152d]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#cf152d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    </div>
                    <h4 className="font-medium text-gray-900">{cert.nombre_evento}</h4>
                  </div>
                  <p className="text-sm text-gray-600 ml-10">Nro: <span className="font-medium text-gray-900">{cert.nro_certificado}</span></p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {cert.estado_pago === 'pagado' ? (
                    <button onClick={() => handleDescargar(cert.nro_certificado, cert.evento_id)} className="flex items-center space-x-2 bg-[#cf152d] text-white px-4 py-2 rounded-lg hover:bg-[#cf152d]/90 transition-colors cursor-pointer text-sm">
                      <Download className="w-4 h-4" /><span>Descargar</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 text-orange-600 text-sm bg-orange-50 px-3 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" /><span>Pago Pendiente</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {totalPaginas > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-sm text-gray-600">Mostrando {inicio + 1}–{Math.min(inicio + certPorPagina, certificados.length)} de {certificados.length}</p>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Anterior</button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPagina(p)} className={`px-3 py-2 text-sm rounded-lg ${p === pagina ? 'bg-[#cf152d] text-white' : 'border border-gray-300 hover:bg-gray-50 cursor-pointer'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Ayuda / Cómo ingresar ── */}
      <Modal
        isOpen={modalAyuda}
        onClose={() => setModalAyuda(false)}
        title="Información de Acceso"
        icon={<Info className="w-6 h-6 text-[#cf152d]" />}
        backdrop="bg-white/30"
      >
        <div className="space-y-4 text-gray-700">
          <p className="text-sm"><strong>Tus credenciales de acceso son:</strong></p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm"><span className="font-semibold text-[#cf152d]">Usuario:</span> Las primeras letras de tu nombre y el primer apellido completo</p>
            <p className="text-sm"><span className="font-semibold text-[#cf152d]">Contraseña:</span> Tu C.I. sin extensiones</p>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Ejemplo de Usuario:</p>
              <p className="text-sm text-gray-700">En el carnet aparece: <span className="font-mono text-[#cf152d]">Cristian David Ramirez Callejas</span></p>
              <p className="text-sm text-gray-700">Solo introducir: <span className="font-mono text-[#cf152d] font-bold">cdramirez</span></p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Ejemplo de Contraseña:</p>
              <p className="text-sm text-gray-700">En el carnet aparece: <span className="font-mono text-[#cf152d]">12345678 SC</span></p>
              <p className="text-sm text-gray-700">Solo introducir: <span className="font-mono text-[#cf152d] font-bold">12345678</span></p>
            </div>
          </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 space-y-2">
              <p className="text-sm text-blue-800"><strong>En caso de inconvenientes</strong>, dirígete al área de Soporte ubicada en el <strong>Tercer Piso</strong></p>
              <p className="text-sm text-blue-800">
                O también puedes enviar un correo con tus datos a{' '}
                <a href="mailto:cristian25ramirezrc@gmail.com" className="font-semibold underline hover:text-blue-900 transition-colors">
                  cristian25ramirezrc@gmail.com
                </a>
              </p>
            </div>
      </div>
      </Modal>

      {/* ── Modal: Verificación Admin ── */}
      <Modal
        isOpen={modalAdmin}
        onClose={() => { setModalAdmin(false); setAdminCode(''); }}
        title="Acceso Administrador"
        icon={<ShieldCheck className="w-8 h-8 text-[#cf152d]" />}
        iconBg="bg-[#cf152d]/10"
      >
        <div className="text-center mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Verificación de Seguridad</h4>
          <p className="text-gray-600 text-sm">Ingresa tu código de administrador para acceder al panel de control</p>
        </div>
        <form onSubmit={handleVerificarAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código de Administrador</label>
            <div className="relative">
              <input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200" placeholder="Ingresa tu código" maxLength={32} autoFocus />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
          </div>
          <button type="submit" disabled={adminLoading} className="w-full bg-gradient-to-r from-[#cf152d] to-[#cf152d]/90 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:scale-100 flex items-center justify-center space-x-2">
            {adminLoading ? (
              <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Verificando...</span></>
            ) : <span>Verificar Código</span>}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">Este código es requerido para acceder a funciones administrativas</p>
      </Modal>
    </>
  );
};

export default LoginPage;