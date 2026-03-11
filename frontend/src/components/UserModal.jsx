import React, { useState, useEffect } from 'react';
import { User, Edit, Trash2, Plus, Save, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * Modal CRUD de usuarios (agregar / editar / eliminar).
 * Usa el componente Modal base para el esqueleto visual.
 */
const UserModal = ({ isOpen, onClose, mode, user = null, onSave, onDelete }) => {
  const [formData, setFormData] = useState({ nombre: '', apellido: '', usuario: '', contrasena: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user && mode === 'edit') {
      setFormData({ nombre: user.nombre || '', apellido: user.apellido || '', usuario: user.usuario || '', contrasena: '' });
    } else if (isOpen && mode === 'add') {
      setFormData({ nombre: '', apellido: '', usuario: '', contrasena: '' });
    }
    setErrors({});
  }, [isOpen, user, mode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    if (!formData.usuario.trim()) newErrors.usuario = 'El usuario es requerido';
    if (mode === 'add' && !formData.contrasena.trim()) newErrors.contrasena = 'La contraseña es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try { await onSave(formData); onClose(); }
    catch { /* el padre maneja el toast */ }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    try { await onDelete(user.id); onClose(); }
    catch { /* el padre maneja el toast */ }
    finally { setLoading(false); }
  };

  // Configuración por modo
  const config = {
    add:    { title: 'Agregar Usuario', icon: <Plus className="w-6 h-6 text-[#cf152d]" />,  iconBg: 'bg-[#cf152d]/10' },
    edit:   { title: 'Editar Usuario',  icon: <Edit className="w-6 h-6 text-[#cf152d]" />,  iconBg: 'bg-[#cf152d]/10' },
    delete: { title: 'Eliminar Usuario',icon: <Trash2 className="w-6 h-6 text-red-600" />,  iconBg: 'bg-red-100' },
  };
  const { title, icon, iconBg } = config[mode] || config.add;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon={icon} iconBg={iconBg}>

      {mode === 'delete' ? (
        // ── Confirmación de eliminación ──
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">¿Eliminar usuario?</h4>
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de que quieres eliminar a{' '}
            <span className="font-semibold">{user?.nombre} {user?.apellido}</span>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex space-x-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer">
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      ) : (
        // ── Formulario agregar / editar ──
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'nombre',   label: 'Nombre',   placeholder: 'Ingresa el nombre' },
            { name: 'apellido', label: 'Apellido', placeholder: 'Ingresa el apellido' },
            { name: 'usuario',  label: 'Usuario',  placeholder: 'Ingresa el usuario' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <input
                type="text"
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 ${errors[name] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={placeholder}
              />
              {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name]}</p>}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña {mode === 'edit' && <span className="font-normal text-gray-500">(dejar vacío para no cambiar)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="contrasena"
                value={formData.contrasena}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#cf152d]/20 focus:border-[#cf152d] transition-all duration-200 ${errors.contrasena ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Ingresa la contraseña"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.contrasena && <p className="mt-1 text-sm text-red-600">{errors.contrasena}</p>}
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-[#cf152d] text-white rounded-lg hover:bg-[#cf152d]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer">
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      )}

    </Modal>
  );
};

export default UserModal;
