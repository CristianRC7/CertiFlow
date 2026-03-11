import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal base reutilizable.
 *
 * Props:
 *  isOpen       boolean   – muestra/oculta el modal
 *  onClose      fn        – callback al cerrar
 *  title        string    – título del header
 *  icon         ReactNode – ícono dentro del cuadro de color
 *  iconBg       string    – clase Tailwind para el fondo del ícono  (default: 'bg-[#cf152d]/10')
 *  maxWidth     string    – clase Tailwind de ancho               (default: 'max-w-md')
 *  backdrop     string    – clase Tailwind del overlay             (default: 'bg-black/50')
 *  zIndex       string    – clase Tailwind de z-index              (default: 'z-50')
 *  scrollable   boolean   – scroll interno para contenido largo    (default: false)
 *  titleAction  ReactNode – elemento extra junto al botón cerrar (ej: botón en header)
 *  children     ReactNode – contenido del modal
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  iconBg = 'bg-[#cf152d]/10',
  maxWidth = 'max-w-md',
  backdrop = 'bg-black/50',
  zIndex = 'z-50',
  scrollable = false,
  titleAction,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${backdrop} backdrop-blur-sm flex items-center justify-center ${zIndex} p-4`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} mx-auto ${scrollable ? 'max-h-[90vh] overflow-hidden flex flex-col' : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                {icon}
              </div>
            )}
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center space-x-3">
            {titleAction}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className={`p-6 ${scrollable ? 'overflow-y-auto' : ''}`}>
          {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;
