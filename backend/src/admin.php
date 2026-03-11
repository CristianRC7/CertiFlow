<?php
// ─────────────────────────────────────────────────────────────────────────────
// admin.php  –  Punto de entrada único para el panel de administración.
// Todas las operaciones administrativas (usuarios, eventos, participaciones) se manejan aquí
//   handlers/UsuariosHandler.php         → usuarios, admins, CSV masivo usuarios
//   handlers/EventosHandler.php          → eventos, imágenes, campos certificado
//   handlers/ParticipacionesHandler.php  → participaciones, CSV masivo eventos
// ─────────────────────────────────────────────────────────────────────────────

error_reporting(0);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once '../conexion.php';
require_once 'handlers/UsuariosHandler.php';
require_once 'handlers/EventosHandler.php';
require_once 'handlers/ParticipacionesHandler.php';

// ── Helpers ───────────────────────────────────────────────────────────────────

function responderError($codigo, $mensaje) {
    http_response_code($codigo);
    echo json_encode(['success' => false, 'message' => $mensaje]);
    exit;
}

function requerirCampos($data, array $campos) {
    foreach ($campos as $campo) {
        if (!isset($data[$campo])) responderError(400, "Campo requerido: $campo");
    }
}

// ── Solo POST ─────────────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') responderError(405, 'Método no permitido');

try {
    $database        = new Database();
    $db              = $database->getConnection();
    $usuarios        = new UsuariosHandler($db);
    $eventos         = new EventosHandler($db);
    $participaciones = new ParticipacionesHandler($db);

    // Leer body (JSON o FormData)
    $data = $_POST;
    if (empty($data)) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) responderError(400, 'Datos inválidos');
    }

    if (!isset($data['action']))        responderError(400, 'Acción requerida');
    if (!isset($data['admin_user_id'])) responderError(401, 'ID de administrador requerido');

    // verificar_codigo_admin es la única acción que no exige ser admin previo
    if ($data['action'] !== 'verificar_codigo_admin') {
        if (!$usuarios->verificarAdmin($data['admin_user_id'])) {
            responderError(403, 'Acceso denegado. Se requieren permisos de administrador');
        }
    }

    // ── Router ────────────────────────────────────────────────────────────────

    switch ($data['action']) {

        // Autenticación
        case 'verificar_codigo_admin':
            requerirCampos($data, ['codigo']);
            $result = $usuarios->verificarCodigoAdmin($data['admin_user_id'], $data['codigo']);
            break;

        // ── Usuarios ──────────────────────────────────────────────────────────
        case 'obtener_usuarios':
            $result = $usuarios->obtenerTodosUsuarios(
                isset($data['pagina'])     ? (int)$data['pagina']     : 1,
                isset($data['por_pagina']) ? (int)$data['por_pagina'] : 20,
                isset($data['busqueda'])   ? trim($data['busqueda'])  : ''
            );
            break;

        case 'agregar_usuario':
            requerirCampos($data, ['user_data']);
            $result = $usuarios->agregarUsuario($data['user_data']);
            break;

        case 'editar_usuario':
            requerirCampos($data, ['user_data', 'user_id']);
            $result = $usuarios->editarUsuario($data['user_data'], $data['user_id']);
            break;

        case 'eliminar_usuario':
            requerirCampos($data, ['user_id']);
            $result = $usuarios->eliminarUsuario($data['user_id']);
            break;

        case 'dar_admin':
            requerirCampos($data, ['user_id', 'codigo']);
            $result = $usuarios->darAdmin($data['user_id'], $data['codigo']);
            break;

        case 'quitar_admin':
            requerirCampos($data, ['user_id']);
            $result = $usuarios->quitarAdmin($data['user_id']);
            break;

        case 'subir_usuarios_archivo':
            $result = $usuarios->subirUsuariosDesdeArchivo($_FILES['archivo'] ?? null);
            break;

        case 'obtener_usuarios_eventos_referencia':
            $result = $usuarios->obtenerUsuariosYEventosReferencia();
            break;

        // ── Eventos ───────────────────────────────────────────────────────────
        case 'obtener_eventos':
            $result = $eventos->obtenerTodosEventos(
                isset($data['pagina'])     ? (int)$data['pagina']     : 1,
                isset($data['por_pagina']) ? (int)$data['por_pagina'] : 15
            );
            break;

        case 'agregar_evento':
            requerirCampos($data, ['evento_data']);
            $result = $eventos->agregarEvento(
                ['nombre_evento' => $data['evento_data']['nombre_evento']],
                $_FILES['imagen'] ?? null
            );
            break;

        case 'editar_evento':
            requerirCampos($data, ['evento_data', 'evento_id']);
            $result = $eventos->editarEvento(
                ['nombre_evento' => $data['evento_data']['nombre_evento']],
                $data['evento_id'],
                $_FILES['imagen'] ?? null
            );
            break;

        case 'eliminar_evento':
            requerirCampos($data, ['evento_id']);
            $result = $eventos->eliminarEvento($data['evento_id']);
            break;

        case 'eliminar_imagen_evento':
            requerirCampos($data, ['evento_id']);
            $result = $eventos->eliminarImagenEvento($data['evento_id']);
            break;

        case 'obtener_campos_evento':
            requerirCampos($data, ['evento_id']);
            $result = $eventos->obtenerCamposEvento($data['evento_id']);
            break;

        case 'guardar_campos_evento':
            requerirCampos($data, ['evento_id', 'campos']);
            if (!is_array($data['campos'])) responderError(400, 'El campo "campos" debe ser un array');
            $result = $eventos->guardarCamposEvento($data['evento_id'], $data['campos']);
            break;

        case 'eliminar_campo_evento':
            requerirCampos($data, ['evento_id', 'campo']);
            $result = $eventos->eliminarCampoEvento($data['evento_id'], $data['campo']);
            break;

        // ── Participaciones ───────────────────────────────────────────────────
        case 'obtener_participaciones_usuario':
            requerirCampos($data, ['user_id']);
            $result = $participaciones->obtenerParticipacionesUsuario($data['user_id']);
            break;

        case 'agregar_participacion':
            requerirCampos($data, ['user_id', 'evento_id', 'nro_certificado', 'estado_pago']);
            $result = $participaciones->agregarParticipacion(
                $data['user_id'], $data['evento_id'],
                $data['nro_certificado'], $data['estado_pago']
            );
            break;

        case 'editar_participacion':
            requerirCampos($data, ['participacion_id', 'nro_certificado', 'estado_pago']);
            $result = $participaciones->editarParticipacion(
                $data['participacion_id'], $data['nro_certificado'], $data['estado_pago']
            );
            break;

        case 'eliminar_participacion':
            requerirCampos($data, ['participacion_id']);
            $result = $participaciones->eliminarParticipacion($data['participacion_id']);
            break;

        case 'subir_participaciones_archivo':
            $result = $participaciones->subirParticipacionesArchivo($_FILES['archivo'] ?? null);
            break;

        default:
            responderError(400, 'Acción no válida');
    }

    echo json_encode($result);

} catch (Exception $e) {
    responderError(500, 'Error interno del servidor');
}