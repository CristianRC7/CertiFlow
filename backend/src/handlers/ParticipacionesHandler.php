<?php
/**
 * ParticipacionesHandler.php
 * Gestión de participaciones de usuarios en eventos y carga masiva desde CSV.
 */
class ParticipacionesHandler {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // ── CRUD Participaciones ──────────────────────────────────────────────────

    public function obtenerParticipacionesUsuario($userId) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT p.id, p.evento_id, p.nro_certificado, p.estado_pago, e.nombre_evento
                 FROM participaciones p
                 INNER JOIN eventos e ON p.evento_id = e.id
                 WHERE p.usuario_id = :user_id
                 ORDER BY e.nombre_evento ASC"
            );
            $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmt->execute();
            $participaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return array(
                'success'         => true,
                'participaciones' => $participaciones,
                'total'           => count($participaciones),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function agregarParticipacion($userId, $eventoId, $nroCertificado, $estadoPago) {
        try {
            // Usuario existe
            $s = $this->conn->prepare("SELECT COUNT(*) as existe FROM usuarios WHERE id = :id");
            $s->execute([':id' => $userId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no existe');
            }

            // Evento existe
            $s = $this->conn->prepare("SELECT COUNT(*) as existe FROM eventos WHERE id = :id");
            $s->execute([':id' => $eventoId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El evento no existe');
            }

            // Certificado duplicado en el mismo evento
            $s = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM participaciones
                 WHERE nro_certificado = :nro AND evento_id = :eid"
            );
            $s->execute([':nro' => $nroCertificado, ':eid' => $eventoId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El número de certificado ya existe en este evento');
            }

            // Participación duplicada (mismo usuario + evento)
            $s = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM participaciones
                 WHERE usuario_id = :uid AND evento_id = :eid"
            );
            $s->execute([':uid' => $userId, ':eid' => $eventoId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El usuario ya participa en este evento');
            }

            $stmt = $this->conn->prepare(
                "INSERT INTO participaciones (usuario_id, evento_id, nro_certificado, estado_pago)
                 VALUES (:uid, :eid, :nro, :estado)"
            );
            $stmt->bindParam(':uid',    $userId,         PDO::PARAM_INT);
            $stmt->bindParam(':eid',    $eventoId,       PDO::PARAM_INT);
            $stmt->bindParam(':nro',    $nroCertificado, PDO::PARAM_STR);
            $stmt->bindParam(':estado', $estadoPago,     PDO::PARAM_STR);
            $stmt->execute();

            return array('success' => true, 'message' => 'Participación agregada correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function editarParticipacion($participacionId, $nroCertificado, $estadoPago) {
        try {
            $s = $this->conn->prepare("SELECT COUNT(*) as existe FROM participaciones WHERE id = :id");
            $s->execute([':id' => $participacionId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'La participación no existe');
            }

            // Certificado duplicado en el mismo evento (excluyendo la participación actual)
            $s = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM participaciones p
                 INNER JOIN participaciones p2 ON p.evento_id = p2.evento_id
                 WHERE p.nro_certificado = :nro
                   AND p.evento_id = (SELECT evento_id FROM participaciones WHERE id = :id)
                   AND p.id != :id"
            );
            $s->bindParam(':nro', $nroCertificado);
            $s->bindParam(':id',  $participacionId, PDO::PARAM_INT);
            $s->execute();
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El número de certificado ya existe en este evento');
            }

            $stmt = $this->conn->prepare(
                "UPDATE participaciones SET nro_certificado = :nro, estado_pago = :estado WHERE id = :id"
            );
            $stmt->bindParam(':nro',    $nroCertificado, PDO::PARAM_STR);
            $stmt->bindParam(':estado', $estadoPago,     PDO::PARAM_STR);
            $stmt->bindParam(':id',     $participacionId, PDO::PARAM_INT);
            $stmt->execute();

            return array('success' => true, 'message' => 'Participación actualizada correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function eliminarParticipacion($participacionId) {
        try {
            $s = $this->conn->prepare("SELECT COUNT(*) as existe FROM participaciones WHERE id = :id");
            $s->execute([':id' => $participacionId]);
            if ($s->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'La participación no existe');
            }

            $stmt = $this->conn->prepare("DELETE FROM participaciones WHERE id = :id");
            $stmt->bindParam(':id', $participacionId, PDO::PARAM_INT);
            $stmt->execute();

            return array('success' => true, 'message' => 'Participación eliminada correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Carga masiva desde CSV ────────────────────────────────────────────────

    public function subirParticipacionesArchivo($archivo) {
        try {
            if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
                return array('success' => false, 'message' => 'Error al subir el archivo');
            }

            $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
            if ($extension !== 'csv' && !in_array($archivo['type'], ['text/csv', 'application/vnd.ms-excel', 'text/plain'])) {
                return array('success' => false, 'message' => 'Solo se permiten archivos CSV');
            }
            if ($archivo['size'] > 5 * 1024 * 1024) {
                return array('success' => false, 'message' => 'El archivo es demasiado grande. Máximo 5MB');
            }

            $handle = fopen($archivo['tmp_name'], 'r');
            if (!$handle) {
                return array('success' => false, 'message' => 'No se pudo abrir el archivo');
            }

            $header = fgetcsv($handle);
            if (!$header) {
                fclose($handle);
                return array('success' => false, 'message' => 'El archivo está vacío');
            }
            $header = array_map('strtolower', array_map('trim', $header));

            foreach (['usuario', 'evento_id', 'nro_certificado', 'estado_pago'] as $col) {
                if (!in_array($col, $header)) {
                    fclose($handle);
                    return array('success' => false, 'message' => "Columna requerida no encontrada: $col");
                }
            }

            $idxUsuario  = array_search('usuario',         $header);
            $idxEventoId = array_search('evento_id',       $header);
            $idxNroCert  = array_search('nro_certificado', $header);
            $idxEstado   = array_search('estado_pago',     $header);

            $exitosos = 0; $duplicados = 0; $errores = array(); $fila = 2;

            while (($row = fgetcsv($handle)) !== false) {
                if (count(array_filter($row, 'strlen')) === 0) { $fila++; continue; }

                $usuario    = isset($row[$idxUsuario])  ? trim($row[$idxUsuario])               : '';
                $eventoId   = isset($row[$idxEventoId]) ? trim($row[$idxEventoId])              : '';
                $nroCert    = isset($row[$idxNroCert])  ? trim($row[$idxNroCert])               : '';
                $estadoPago = isset($row[$idxEstado])   ? strtolower(trim($row[$idxEstado]))    : '';

                if (empty($usuario) || empty($eventoId) || empty($nroCert) || empty($estadoPago)) {
                    $errores[] = "Fila $fila: Todos los campos son requeridos";
                    $fila++; continue;
                }
                if (!in_array($estadoPago, ['pagado', 'pendiente'])) {
                    $errores[] = "Fila $fila: estado_pago debe ser 'pagado' o 'pendiente' (recibido: '$estadoPago')";
                    $fila++; continue;
                }
                if (!is_numeric($eventoId) || intval($eventoId) <= 0) {
                    $errores[] = "Fila $fila: evento_id '$eventoId' no es válido";
                    $fila++; continue;
                }
                $eventoId = intval($eventoId);

                // Verificar usuario
                $s = $this->conn->prepare("SELECT id FROM usuarios WHERE usuario = :usuario");
                $s->bindParam(':usuario', $usuario, PDO::PARAM_STR);
                $s->execute();
                $usuarioRow = $s->fetch(PDO::FETCH_ASSOC);
                if (!$usuarioRow) {
                    $errores[] = "Fila $fila: El usuario '$usuario' no existe en el sistema";
                    $fila++; continue;
                }
                $usuarioId = $usuarioRow['id'];

                // Verificar evento
                $s = $this->conn->prepare("SELECT id FROM eventos WHERE id = :id");
                $s->execute([':id' => $eventoId]);
                if (!$s->fetch()) {
                    $errores[] = "Fila $fila: El evento con ID '$eventoId' no existe";
                    $fila++; continue;
                }

                // Verificar duplicado
                $s = $this->conn->prepare(
                    "SELECT id FROM participaciones WHERE usuario_id = :uid AND evento_id = :eid"
                );
                $s->execute([':uid' => $usuarioId, ':eid' => $eventoId]);
                if ($s->fetch()) {
                    $duplicados++;
                    $errores[] = "Fila $fila: '$usuario' ya está registrado en el evento ID $eventoId (omitido)";
                    $fila++; continue;
                }

                try {
                    $stmt = $this->conn->prepare(
                        "INSERT INTO participaciones (usuario_id, evento_id, nro_certificado, estado_pago)
                         VALUES (:uid, :eid, :nro, :estado)"
                    );
                    $stmt->bindParam(':uid',    $usuarioId,  PDO::PARAM_INT);
                    $stmt->bindParam(':eid',    $eventoId,   PDO::PARAM_INT);
                    $stmt->bindParam(':nro',    $nroCert,    PDO::PARAM_STR);
                    $stmt->bindParam(':estado', $estadoPago, PDO::PARAM_STR);
                    $stmt->execute();
                    $exitosos++;
                } catch (PDOException $e) {
                    $errores[] = "Fila $fila: Error al insertar — " . $e->getMessage();
                }

                $fila++;
            }

            fclose($handle);

            return array(
                'success'    => true,
                'exitosos'   => $exitosos,
                'duplicados' => $duplicados,
                'errores'    => $errores,
                'message'    => "$exitosos participación(es) registrada(s). $duplicados duplicado(s) omitido(s). " . count($errores) . " error(es).",
            );
        } catch (Exception $e) {
            return array('success' => false, 'message' => 'Error al procesar el archivo: ' . $e->getMessage());
        }
    }
}