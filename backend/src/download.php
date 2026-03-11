<?php
// Configuración de seguridad
error_reporting(0);
ini_set('display_errors', 0);

// Headers de seguridad
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Validar parámetros requeridos
if (!isset($_GET['userId']) || !isset($_GET['certificateId']) || !isset($_GET['eventoId'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos para generar el certificado']);
    exit;
}

$userId         = filter_var($_GET['userId'], FILTER_VALIDATE_INT);
$eventoId       = filter_var($_GET['eventoId'], FILTER_VALIDATE_INT);
$nroCertificado = filter_var($_GET['certificateId'], FILTER_SANITIZE_STRING);

if ($userId === false || $userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de usuario inválido']);
    exit;
}

if ($eventoId === false || $eventoId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de evento inválido']);
    exit;
}

if (empty($nroCertificado) || strlen($nroCertificado) > 50) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Número de certificado inválido']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9\-_]+$/', $nroCertificado)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de certificado inválido']);
    exit;
}

try {
    require_once '../conexion.php';
    require_once './library/vendor/tecnickcom/tcpdf/tcpdf.php';

    $database = new Database();
    $db       = $database->getConnection();

    // ── 1. Obtener datos del certificado junto con dimensiones del evento ──────
    $query = "SELECT 
                u.nombre,
                u.apellido,
                p.nro_certificado,
                p.estado_pago,
                e.id            AS evento_id,
                e.nombre_evento,
                e.imagen_certificado,
                e.imagen_width,
                e.imagen_height
              FROM usuarios u
              INNER JOIN participaciones p ON u.id = p.usuario_id
              INNER JOIN eventos e         ON p.evento_id = e.id
              WHERE u.id = :userId AND p.evento_id = :eventoId AND p.nro_certificado = :nroCertificado";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':userId',         $userId,         PDO::PARAM_INT);
    $stmt->bindParam(':eventoId',       $eventoId,       PDO::PARAM_INT);
    $stmt->bindParam(':nroCertificado', $nroCertificado, PDO::PARAM_STR);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Certificado no encontrado']);
        exit;
    }

    if ($result['estado_pago'] !== 'pagado') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'El certificado tiene pago pendiente. No se puede descargar.']);
        exit;
    }

    // ── 2. Obtener campos de posición configurados para este evento ────────────
    $queryCampos = "SELECT campo, x_pct, y_pct, font_size, font_style 
                    FROM evento_campos 
                    WHERE evento_id = :evento_id";
    $stmtCampos  = $db->prepare($queryCampos);
    $stmtCampos->bindParam(':evento_id', $result['evento_id'], PDO::PARAM_INT);
    $stmtCampos->execute();
    $camposConfig = $stmtCampos->fetchAll(PDO::FETCH_ASSOC);

    if (empty($camposConfig)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Este evento no tiene campos de posición configurados. Configúralos desde el panel de administración.']);
        exit;
    }

    // ── 3. Validar imagen ──────────────────────────────────────────────────────
    $imagenCertificado  = $result['imagen_certificado'];
    $useBackgroundImage = false;
    $imageFile          = '';

    if (!empty($imagenCertificado) &&
        preg_match('/^[A-Za-z0-9\-_\.]+\.(jpg|jpeg|png)$/i', $imagenCertificado) &&
        strpos($imagenCertificado, '..') === false &&
        strpos($imagenCertificado, '/')  === false &&
        strpos($imagenCertificado, '\\') === false) {

        $certificatesDir = __DIR__ . '/certificates/';
        $imageFile       = $certificatesDir . basename($imagenCertificado);
        $realImagePath   = realpath($imageFile);
        $realCertDir     = realpath($certificatesDir);

        if ($realImagePath !== false && $realCertDir !== false &&
            strpos($realImagePath, $realCertDir) === 0 &&
            file_exists($imageFile) && is_readable($imageFile)) {
            $useBackgroundImage = true;
        }
    }

    // ── 4. Calcular dimensiones del PDF ───────────────────────────────────────
    // Usa las dimensiones reales guardadas en la BD para orientación dinámica.
    // Si no hay dimensiones registradas, fallback a A4 vertical.
    $imgW = intval($result['imagen_width']);
    $imgH = intval($result['imagen_height']);

    if ($imgW > 0 && $imgH > 0) {
        // Convertir píxeles a mm (96 DPI: 1 px = 25.4/96 mm)
        $pxToMm  = 25.4 / 96;
        $pdfW_mm = $imgW * $pxToMm;
        $pdfH_mm = $imgH * $pxToMm;

        // Orientación dinámica: horizontal si ancho > alto, vertical si no
        $orientation = ($imgW > $imgH) ? 'L' : 'P';
        $pdf = new TCPDF($orientation, 'mm', [$pdfW_mm, $pdfH_mm], true, 'UTF-8', false);
    } else {
        // Fallback A4 vertical
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    }

    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false, 0);
    $pdf->AddPage();

    // ── 5. Imagen de fondo ────────────────────────────────────────────────────
    if ($useBackgroundImage) {
        $pdf->Image(
            $imageFile,
            0, 0,
            $pdf->getPageWidth(), $pdf->getPageHeight(),
            '', '', '', false, 300, '', false, false, 0, false, false, false
        );
    } else {
        $pdf->SetFillColor(255, 255, 255);
        $pdf->Rect(0, 0, $pdf->getPageWidth(), $pdf->getPageHeight(), 'F');
    }

    // ── 6. Preparar valores de los campos ─────────────────────────────────────
    $nombre   = mb_strtoupper(trim($result['nombre']),   'UTF-8');
    $apellido = mb_strtoupper(trim($result['apellido']), 'UTF-8');

    $valoresCampos = [
        'nombre_apellido' => $nombre . ' ' . $apellido,
        'apellido_nombre' => $apellido . ' ' . $nombre,
        'nro_certificado' => 'Nro* ' . $nroCertificado,
    ];

    $pageW = $pdf->getPageWidth();
    $pageH = $pdf->getPageHeight();

    // ── 7. Dibujar cada campo en su posición configurada ──────────────────────
    // Las posiciones se guardan como porcentaje (0–100) del tamaño total de la imagen.
    // El punto marcado corresponde al CENTRO del texto (tanto horizontal como vertical).
    foreach ($camposConfig as $campo) {
        $nombreCampo = $campo['campo'];
        if (!isset($valoresCampos[$nombreCampo])) continue;

        $texto     = $valoresCampos[$nombreCampo];
        $fontSize  = max(6, intval($campo['font_size']));
        $fontStyle = in_array($campo['font_style'], ['', 'B', 'I', 'BI']) ? $campo['font_style'] : 'B';
        $xPct      = floatval($campo['x_pct']);
        $yPct      = floatval($campo['y_pct']);

        // Convertir % a mm
        $xAbs = ($xPct / 100) * $pageW;
        $yAbs = ($yPct / 100) * $pageH;

        $pdf->SetFont('helvetica', $fontStyle, $fontSize);

        // Centrar horizontalmente respecto al punto marcado
        $textWidth = $pdf->GetStringWidth($texto);
        $xFinal    = $xAbs - ($textWidth / 2);

        // Centrar verticalmente respecto al punto marcado
        // En TCPDF la coordenada Y es la parte superior del texto
        // La altura del texto en mm es aproximadamente: fontSize (pt) * 0.3528 (mm/pt)
        $textHeight = $fontSize * 0.3528;
        $yFinal     = $yAbs - ($textHeight / 2);

        // Guardar que no se salga del borde izquierdo/derecho
        if ($xFinal < 0)                          $xFinal = 0;
        if ($xFinal + $textWidth > $pageW)        $xFinal = $pageW - $textWidth;
        
        // Guardar que no se salga del borde superior/inferior
        if ($yFinal < 0)                          $yFinal = 0;
        if ($yFinal + $textHeight > $pageH)       $yFinal = $pageH - $textHeight;

        $pdf->Text($xFinal, $yFinal, $texto);
    }

    // ── 8. Generar y descargar PDF ────────────────────────────────────────────
    $nombreArchivo = 'certificado_' . str_replace(' ', '_', strtolower($result['nombre_evento'])) . '.pdf';
    $pdf->Output($nombreArchivo, 'D');
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    exit;
}
?>