<?php
/**
 * EventosHandler.php
 * Gestión de eventos, imágenes de certificado y configuración de campos de posición.
 */
class EventosHandler {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // ── CRUD Eventos ──────────────────────────────────────────────────────────

    public function obtenerTodosEventos($pagina = 1, $porPagina = 15) {
        try {
            $offset = ($pagina - 1) * $porPagina;

            $stmtTotal = $this->conn->prepare("SELECT COUNT(*) as total FROM eventos");
            $stmtTotal->execute();
            $total = $stmtTotal->fetch(PDO::FETCH_ASSOC)['total'];

            $stmt = $this->conn->prepare(
                "SELECT e.id, e.nombre_evento, e.imagen_certificado, e.imagen_width, e.imagen_height,
                        COUNT(ec.id) as campos_configurados
                 FROM eventos e
                 LEFT JOIN evento_campos ec ON e.id = ec.evento_id
                 GROUP BY e.id, e.nombre_evento, e.imagen_certificado, e.imagen_width, e.imagen_height
                 ORDER BY e.nombre_evento ASC
                 LIMIT :limit OFFSET :offset"
            );
            $stmt->bindParam(':limit',  $porPagina, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset,    PDO::PARAM_INT);
            $stmt->execute();

            return array(
                'success'       => true,
                'eventos'       => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'total'         => $total,
                'pagina_actual' => $pagina,
                'por_pagina'    => $porPagina,
                'total_paginas' => ceil($total / $porPagina),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function agregarEvento($eventoData, $imagenFile = null) {
        try {
            if (empty($eventoData['nombre_evento'])) {
                return array('success' => false, 'message' => 'El nombre del evento es requerido');
            }

            $imagen_certificado = null;
            $imagen_width       = null;
            $imagen_height      = null;

            if ($imagenFile && $imagenFile['error'] === UPLOAD_ERR_OK) {
                $resultado = $this->procesarImagenSubida($imagenFile);
                if (!$resultado['success']) return $resultado;
                $imagen_certificado = $resultado['nombre'];
                $imagen_width       = $resultado['width'];
                $imagen_height      = $resultado['height'];
            }

            $stmt = $this->conn->prepare(
                "INSERT INTO eventos (nombre_evento, imagen_certificado, imagen_width, imagen_height)
                 VALUES (:nombre_evento, :imagen_certificado, :imagen_width, :imagen_height)"
            );
            $stmt->bindParam(':nombre_evento',      $eventoData['nombre_evento'], PDO::PARAM_STR);
            $stmt->bindParam(':imagen_certificado', $imagen_certificado,           PDO::PARAM_STR);
            $stmt->bindParam(':imagen_width',       $imagen_width,                 PDO::PARAM_INT);
            $stmt->bindParam(':imagen_height',      $imagen_height,                PDO::PARAM_INT);
            $stmt->execute();

            return array(
                'success' => true,
                'message' => 'Evento agregado correctamente',
                'id'      => $this->conn->lastInsertId(),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function editarEvento($eventoData, $eventoId, $imagenFile = null) {
        try {
            if (empty($eventoData['nombre_evento'])) {
                return array('success' => false, 'message' => 'El nombre del evento es requerido');
            }

            $stmtCurrent = $this->conn->prepare(
                "SELECT imagen_certificado, imagen_width, imagen_height FROM eventos WHERE id = :id"
            );
            $stmtCurrent->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmtCurrent->execute();
            $current = $stmtCurrent->fetch(PDO::FETCH_ASSOC);

            $imagen_certificado = $current['imagen_certificado'];
            $imagen_width       = $current['imagen_width'];
            $imagen_height      = $current['imagen_height'];
            $imagenCambiada     = false;

            if ($imagenFile && $imagenFile['error'] === UPLOAD_ERR_OK) {
                // Eliminar imagen anterior
                if ($current['imagen_certificado']) {
                    $oldPath = __DIR__ . '/../certificates/' . $current['imagen_certificado'];
                    if (file_exists($oldPath)) unlink($oldPath);
                }

                $resultado = $this->procesarImagenSubida($imagenFile);
                if (!$resultado['success']) return $resultado;

                $imagen_certificado = $resultado['nombre'];
                $imagen_width       = $resultado['width'];
                $imagen_height      = $resultado['height'];
                $imagenCambiada     = true;
            }

            $this->conn->beginTransaction();
            try {
                if ($imagenCambiada) {
                    $this->conn->prepare("DELETE FROM evento_campos WHERE evento_id = :id")
                        ->execute([':id' => $eventoId]);
                }

                $stmt = $this->conn->prepare(
                    "UPDATE eventos SET nombre_evento = :nombre_evento,
                     imagen_certificado = :imagen_certificado,
                     imagen_width = :imagen_width, imagen_height = :imagen_height
                     WHERE id = :id"
                );
                $stmt->bindParam(':nombre_evento',      $eventoData['nombre_evento'], PDO::PARAM_STR);
                $stmt->bindParam(':imagen_certificado', $imagen_certificado,           PDO::PARAM_STR);
                $stmt->bindParam(':imagen_width',       $imagen_width,                 PDO::PARAM_INT);
                $stmt->bindParam(':imagen_height',      $imagen_height,                PDO::PARAM_INT);
                $stmt->bindParam(':id',                 $eventoId,                     PDO::PARAM_INT);
                $stmt->execute();

                $this->conn->commit();
            } catch (PDOException $e) {
                $this->conn->rollBack();
                throw $e;
            }

            return array(
                'success'         => true,
                'message'         => 'Evento actualizado correctamente' . ($imagenCambiada ? '. Los campos de posición fueron eliminados porque la imagen cambió.' : ''),
                'imagen_cambiada' => $imagenCambiada,
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function eliminarEvento($eventoId) {
        try {
            $stmtCheck = $this->conn->prepare(
                "SELECT COUNT(*) as total FROM participaciones WHERE evento_id = :evento_id"
            );
            $stmtCheck->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmtCheck->execute();
            if ($stmtCheck->fetch(PDO::FETCH_ASSOC)['total'] > 0) {
                return array('success' => false, 'message' => 'No se puede eliminar el evento porque tiene participaciones asociadas');
            }

            $stmtImg = $this->conn->prepare(
                "SELECT imagen_certificado FROM eventos WHERE id = :id"
            );
            $stmtImg->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmtImg->execute();
            $evento = $stmtImg->fetch(PDO::FETCH_ASSOC);

            $stmt = $this->conn->prepare("DELETE FROM eventos WHERE id = :id");
            $stmt->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                if ($evento && $evento['imagen_certificado']) {
                    $path = __DIR__ . '/../certificates/' . $evento['imagen_certificado'];
                    if (file_exists($path)) unlink($path);
                }
                return array('success' => true, 'message' => 'Evento eliminado correctamente');
            }

            return array('success' => false, 'message' => 'No se encontró el evento');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function eliminarImagenEvento($eventoId) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT imagen_certificado FROM eventos WHERE id = :id"
            );
            $stmt->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmt->execute();
            $evento = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$evento) {
                return array('success' => false, 'message' => 'No se encontró el evento');
            }
            if (!$evento['imagen_certificado']) {
                return array('success' => false, 'message' => 'El evento no tiene imagen asociada');
            }

            $path = __DIR__ . '/../certificates/' . $evento['imagen_certificado'];
            if (file_exists($path)) unlink($path);

            $this->conn->prepare(
                "UPDATE eventos SET imagen_certificado = NULL, imagen_width = NULL, imagen_height = NULL WHERE id = :id"
            )->execute([':id' => $eventoId]);

            $this->conn->prepare(
                "DELETE FROM evento_campos WHERE evento_id = :id"
            )->execute([':id' => $eventoId]);

            return array('success' => true, 'message' => 'Imagen y campos de posición eliminados correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Campos de posición del certificado ────────────────────────────────────

    public function obtenerCamposEvento($eventoId) {
        try {
            $stmtEvento = $this->conn->prepare(
                "SELECT id, nombre_evento, imagen_certificado, imagen_width, imagen_height
                 FROM eventos WHERE id = :id"
            );
            $stmtEvento->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmtEvento->execute();
            $evento = $stmtEvento->fetch(PDO::FETCH_ASSOC);

            if (!$evento) {
                return array('success' => false, 'message' => 'El evento no existe');
            }

            $stmtCampos = $this->conn->prepare(
                "SELECT id, campo, x_pct, y_pct, font_size, font_style
                 FROM evento_campos WHERE evento_id = :evento_id"
            );
            $stmtCampos->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmtCampos->execute();

            return array(
                'success' => true,
                'evento'  => $evento,
                'campos'  => $stmtCampos->fetchAll(PDO::FETCH_ASSOC),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function guardarCamposEvento($eventoId, $campos) {
        try {
            $stmtCheck = $this->conn->prepare(
                "SELECT id, imagen_width, imagen_height FROM eventos WHERE id = :id"
            );
            $stmtCheck->bindParam(':id', $eventoId, PDO::PARAM_INT);
            $stmtCheck->execute();
            $evento = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$evento) {
                return array('success' => false, 'message' => 'El evento no existe');
            }
            if (!$evento['imagen_width'] || !$evento['imagen_height']) {
                return array('success' => false, 'message' => 'El evento no tiene imagen con dimensiones registradas. Sube la imagen primero.');
            }

            $camposValidos      = ['nombre_apellido', 'apellido_nombre', 'nro_certificado'];
            $fontStylesValidos  = ['', 'B', 'I', 'BI'];

            $this->conn->beginTransaction();
            try {
                foreach ($campos as $campo) {
                    if (!isset($campo['campo']) || !in_array($campo['campo'], $camposValidos)) {
                        $this->conn->rollBack();
                        return array('success' => false, 'message' => 'Campo inválido: ' . ($campo['campo'] ?? 'desconocido'));
                    }

                    $x_pct     = floatval($campo['x_pct']);
                    $y_pct     = floatval($campo['y_pct']);
                    $fontSize  = isset($campo['font_size'])  ? intval($campo['font_size'])  : 20;
                    $fontStyle = (isset($campo['font_style']) && in_array($campo['font_style'], $fontStylesValidos))
                                 ? $campo['font_style'] : 'B';

                    if ($x_pct < 0 || $x_pct > 100 || $y_pct < 0 || $y_pct > 100) {
                        $this->conn->rollBack();
                        return array('success' => false, 'message' => 'Posición fuera de rango (0-100%) para el campo: ' . $campo['campo']);
                    }

                    $stmt = $this->conn->prepare(
                        "INSERT INTO evento_campos (evento_id, campo, x_pct, y_pct, font_size, font_style)
                         VALUES (:evento_id, :campo, :x_pct, :y_pct, :font_size, :font_style)
                         ON DUPLICATE KEY UPDATE
                           x_pct = VALUES(x_pct), y_pct = VALUES(y_pct),
                           font_size = VALUES(font_size), font_style = VALUES(font_style)"
                    );
                    $stmt->bindParam(':evento_id',  $eventoId,   PDO::PARAM_INT);
                    $stmt->bindParam(':campo',      $campo['campo'], PDO::PARAM_STR);
                    $stmt->bindParam(':x_pct',      $x_pct);
                    $stmt->bindParam(':y_pct',      $y_pct);
                    $stmt->bindParam(':font_size',  $fontSize,   PDO::PARAM_INT);
                    $stmt->bindParam(':font_style', $fontStyle,  PDO::PARAM_STR);
                    $stmt->execute();
                }

                $this->conn->commit();
                return array('success' => true, 'message' => 'Campos guardados correctamente');
            } catch (PDOException $e) {
                $this->conn->rollBack();
                throw $e;
            }
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function eliminarCampoEvento($eventoId, $campo) {
        try {
            $stmt = $this->conn->prepare(
                "DELETE FROM evento_campos WHERE evento_id = :evento_id AND campo = :campo"
            );
            $stmt->bindParam(':evento_id', $eventoId, PDO::PARAM_INT);
            $stmt->bindParam(':campo',     $campo,    PDO::PARAM_STR);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return array('success' => true,  'message' => 'Campo eliminado correctamente');
            }
            return array('success' => false, 'message' => 'No se encontró el campo');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Helper privado: subir imagen ──────────────────────────────────────────

    private function procesarImagenSubida($imagenFile) {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

        if (!in_array($imagenFile['type'], $allowedTypes)) {
            return array('success' => false, 'message' => 'Solo se permiten archivos PNG y JPG');
        }
        if ($imagenFile['size'] > 15 * 1024 * 1024) {
            return array('success' => false, 'message' => 'El archivo es demasiado grande. Máximo 15MB');
        }

        $extension  = pathinfo($imagenFile['name'], PATHINFO_EXTENSION);
        $nombre     = uniqid() . '_' . time() . '.' . $extension;
        $uploadDir  = __DIR__ . '/../certificates/';
        $uploadPath = $uploadDir . $nombre;

        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        if (!move_uploaded_file($imagenFile['tmp_name'], $uploadPath)) {
            return array('success' => false, 'message' => 'Error al subir el archivo');
        }

        $info   = getimagesize($uploadPath);
        $width  = $info ? $info[0] : null;
        $height = $info ? $info[1] : null;

        return array('success' => true, 'nombre' => $nombre, 'width' => $width, 'height' => $height);
    }
}