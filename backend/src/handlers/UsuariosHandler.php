<?php
/**
 * UsuariosHandler.php
 * Gestión de usuarios, permisos de administrador y carga masiva de usuarios.
 */
class UsuariosHandler {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // ── Autenticación ─────────────────────────────────────────────────────────

    public function verificarAdmin($usuario_id) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as es_admin FROM administradores
                 WHERE usuario_id = :usuario_id AND activo = 1"
            );
            $stmt->bindParam(':usuario_id', $usuario_id, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result && $result['es_admin'] > 0;
        } catch (PDOException $e) {
            return false;
        }
    }

    public function verificarCodigoAdmin($usuario_id, $codigo) {
        try {
            $stmt = $this->conn->prepare(
                "SELECT codigo, activo FROM administradores
                 WHERE usuario_id = :usuario_id AND activo = 1"
            );
            $stmt->bindParam(':usuario_id', $usuario_id, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return array('success' => false, 'message' => 'No tienes permisos de administrador');
            }

            if ($result['codigo'] === md5($codigo)) {
                return array('success' => true, 'message' => 'Código verificado correctamente');
            }

            return array('success' => false, 'message' => 'Código de administrador incorrecto');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── CRUD Usuarios ─────────────────────────────────────────────────────────

    public function obtenerTodosUsuarios($pagina = 1, $porPagina = 20, $busqueda = '') {
        try {
            $offset        = ($pagina - 1) * $porPagina;
            $tieneBusqueda = !empty(trim($busqueda));
            $like          = '%' . trim($busqueda) . '%';

            if ($tieneBusqueda) {
                $stmtTotal = $this->conn->prepare(
                    "SELECT COUNT(*) as total FROM usuarios
                     WHERE nombre LIKE :b1 OR apellido LIKE :b2 OR usuario LIKE :b3"
                );
                $stmtTotal->bindParam(':b1', $like, PDO::PARAM_STR);
                $stmtTotal->bindParam(':b2', $like, PDO::PARAM_STR);
                $stmtTotal->bindParam(':b3', $like, PDO::PARAM_STR);
            } else {
                $stmtTotal = $this->conn->prepare("SELECT COUNT(*) as total FROM usuarios");
            }
            $stmtTotal->execute();
            $total = $stmtTotal->fetch(PDO::FETCH_ASSOC)['total'];

            $baseSelect = "SELECT u.id, u.nombre, u.apellido, u.usuario,
                                  CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as es_admin
                           FROM usuarios u
                           LEFT JOIN administradores a ON u.id = a.usuario_id AND a.activo = 1";

            if ($tieneBusqueda) {
                $stmt = $this->conn->prepare(
                    "$baseSelect
                     WHERE u.nombre LIKE :b1 OR u.apellido LIKE :b2 OR u.usuario LIKE :b3
                     ORDER BY u.apellido, u.nombre ASC
                     LIMIT :limit OFFSET :offset"
                );
                $stmt->bindParam(':b1', $like, PDO::PARAM_STR);
                $stmt->bindParam(':b2', $like, PDO::PARAM_STR);
                $stmt->bindParam(':b3', $like, PDO::PARAM_STR);
            } else {
                $stmt = $this->conn->prepare(
                    "$baseSelect
                     ORDER BY u.apellido, u.nombre ASC
                     LIMIT :limit OFFSET :offset"
                );
            }
            $stmt->bindParam(':limit',  $porPagina, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset,    PDO::PARAM_INT);
            $stmt->execute();

            return array(
                'success'       => true,
                'usuarios'      => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'total'         => $total,
                'pagina_actual' => $pagina,
                'por_pagina'    => $porPagina,
                'total_paginas' => ceil($total / $porPagina),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function agregarUsuario($userData) {
        try {
            $stmtCheck = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE usuario = :usuario"
            );
            $stmtCheck->bindParam(':usuario', $userData['usuario']);
            $stmtCheck->execute();
            if ($stmtCheck->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El usuario ya existe');
            }

            $stmt = $this->conn->prepare(
                "INSERT INTO usuarios (nombre, apellido, usuario, contrasena)
                 VALUES (:nombre, :apellido, :usuario, :contrasena)"
            );
            $stmt->bindParam(':nombre',    $userData['nombre']);
            $stmt->bindParam(':apellido',  $userData['apellido']);
            $stmt->bindParam(':usuario',   $userData['usuario']);
            $hash = md5($userData['contrasena']);
            $stmt->bindParam(':contrasena', $hash);
            $stmt->execute();

            return array('success' => true, 'message' => 'Usuario agregado correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function editarUsuario($userData, $userId) {
        try {
            $stmtCheck = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE id = :id"
            );
            $stmtCheck->bindParam(':id', $userId, PDO::PARAM_INT);
            $stmtCheck->execute();
            if ($stmtCheck->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no existe');
            }

            $stmtDup = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE usuario = :usuario AND id != :id"
            );
            $stmtDup->bindParam(':usuario', $userData['usuario']);
            $stmtDup->bindParam(':id', $userId, PDO::PARAM_INT);
            $stmtDup->execute();
            if ($stmtDup->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El nombre de usuario ya existe');
            }

            if (!empty($userData['contrasena'])) {
                $stmt = $this->conn->prepare(
                    "UPDATE usuarios SET nombre = :nombre, apellido = :apellido,
                     usuario = :usuario, contrasena = :contrasena WHERE id = :id"
                );
                $hash = md5($userData['contrasena']);
                $stmt->bindParam(':contrasena', $hash);
            } else {
                $stmt = $this->conn->prepare(
                    "UPDATE usuarios SET nombre = :nombre, apellido = :apellido,
                     usuario = :usuario WHERE id = :id"
                );
            }
            $stmt->bindParam(':nombre',   $userData['nombre']);
            $stmt->bindParam(':apellido', $userData['apellido']);
            $stmt->bindParam(':usuario',  $userData['usuario']);
            $stmt->bindParam(':id', $userId, PDO::PARAM_INT);
            $stmt->execute();

            return array('success' => true, 'message' => 'Usuario actualizado correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function eliminarUsuario($userId) {
        try {
            $stmtCheck = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE id = :id"
            );
            $stmtCheck->bindParam(':id', $userId, PDO::PARAM_INT);
            $stmtCheck->execute();
            if ($stmtCheck->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no existe');
            }

            $this->conn->beginTransaction();
            try {
                $this->conn->prepare("DELETE FROM administradores  WHERE usuario_id = :id")
                    ->execute([':id' => $userId]);
                $this->conn->prepare("DELETE FROM participaciones  WHERE usuario_id = :id")
                    ->execute([':id' => $userId]);
                $this->conn->prepare("DELETE FROM usuarios         WHERE id = :id")
                    ->execute([':id' => $userId]);
                $this->conn->commit();

                return array(
                    'success' => true,
                    'message' => 'Usuario, participaciones y permisos de administrador eliminados correctamente',
                );
            } catch (PDOException $e) {
                $this->conn->rollBack();
                throw $e;
            }
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Gestión de administradores ────────────────────────────────────────────

    public function darAdmin($userId, $codigo) {
        try {
            $stmtUser = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE id = :user_id"
            );
            $stmtUser->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmtUser->execute();
            if ($stmtUser->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no existe');
            }

            $stmtAdmin = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM administradores WHERE usuario_id = :user_id AND activo = 1"
            );
            $stmtAdmin->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmtAdmin->execute();
            if ($stmtAdmin->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                return array('success' => false, 'message' => 'El usuario ya es administrador');
            }

            if (empty($codigo)) {
                return array('success' => false, 'message' => 'El código de administrador es requerido');
            }

            $stmt = $this->conn->prepare(
                "INSERT INTO administradores (usuario_id, codigo, activo) VALUES (:user_id, :codigo, 1)"
            );
            $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':codigo',  $codigo);
            $stmt->execute();

            return array('success' => true, 'message' => 'Usuario promovido a administrador correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    public function quitarAdmin($userId) {
        try {
            $stmtUser = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM usuarios WHERE id = :user_id"
            );
            $stmtUser->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmtUser->execute();
            if ($stmtUser->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no existe');
            }

            $stmtAdmin = $this->conn->prepare(
                "SELECT COUNT(*) as existe FROM administradores WHERE usuario_id = :user_id AND activo = 1"
            );
            $stmtAdmin->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmtAdmin->execute();
            if ($stmtAdmin->fetch(PDO::FETCH_ASSOC)['existe'] == 0) {
                return array('success' => false, 'message' => 'El usuario no es administrador');
            }

            $stmt = $this->conn->prepare("DELETE FROM administradores WHERE usuario_id = :user_id");
            $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmt->execute();

            return array('success' => true, 'message' => 'Privilegios de administrador removidos correctamente');
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Carga masiva de usuarios ──────────────────────────────────────────────

    public function subirUsuariosDesdeArchivo($archivo) {
        try {
            if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
                return array('success' => false, 'message' => 'Error al subir el archivo');
            }

            $allowedTypes = [
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            if (!in_array($archivo['type'], $allowedTypes)) {
                return array('success' => false, 'message' => 'Solo se permiten archivos CSV y Excel (.xls, .xlsx)');
            }
            if ($archivo['size'] > 5 * 1024 * 1024) {
                return array('success' => false, 'message' => 'El archivo es demasiado grande. Máximo 5MB');
            }

            $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
            $datos = $extension === 'csv'
                ? $this->procesarCSV($archivo['tmp_name'])
                : $this->procesarExcel($archivo['tmp_name']);

            if (!$datos['success']) return $datos;

            $exitosos = 0; $duplicados = 0; $errores = array();

            foreach ($datos['data'] as $index => $usuario) {
                $fila = $index + 2;

                if (empty($usuario['nombre']) || empty($usuario['apellido']) ||
                    empty($usuario['usuario']) || empty($usuario['contrasena'])) {
                    $errores[] = "Fila $fila: Todos los campos son requeridos";
                    continue;
                }
                if (strlen($usuario['nombre']) > 100 || strlen($usuario['apellido']) > 100) {
                    $errores[] = "Fila $fila: Nombre y apellido no pueden exceder 100 caracteres";
                    continue;
                }
                if (strlen($usuario['usuario']) > 50) {
                    $errores[] = "Fila $fila: Usuario no puede exceder 50 caracteres";
                    continue;
                }

                $stmtCheck = $this->conn->prepare(
                    "SELECT COUNT(*) as existe FROM usuarios WHERE usuario = :usuario"
                );
                $stmtCheck->bindParam(':usuario', $usuario['usuario'], PDO::PARAM_STR);
                $stmtCheck->execute();
                if ($stmtCheck->fetch(PDO::FETCH_ASSOC)['existe'] > 0) {
                    $duplicados++;
                    continue;
                }

                try {
                    $stmt = $this->conn->prepare(
                        "INSERT INTO usuarios (nombre, apellido, usuario, contrasena)
                         VALUES (:nombre, :apellido, :usuario, :contrasena)"
                    );
                    $stmt->bindParam(':nombre',    $usuario['nombre'],    PDO::PARAM_STR);
                    $stmt->bindParam(':apellido',  $usuario['apellido'],  PDO::PARAM_STR);
                    $stmt->bindParam(':usuario',   $usuario['usuario'],   PDO::PARAM_STR);
                    $hash = md5($usuario['contrasena']);
                    $stmt->bindParam(':contrasena', $hash, PDO::PARAM_STR);
                    $stmt->execute();
                    $exitosos++;
                } catch (PDOException $e) {
                    $errores[] = "Fila $fila: Error al insertar — " . $e->getMessage();
                }
            }

            $msg = "Proceso completado. ";
            if ($exitosos   > 0) $msg .= "$exitosos usuarios agregados. ";
            if ($duplicados > 0) $msg .= "$duplicados duplicados omitidos. ";
            if (count($errores) > 0) $msg .= count($errores) . " errores encontrados.";

            return array(
                'success'    => true,
                'message'    => $msg,
                'exitosos'   => $exitosos,
                'duplicados' => $duplicados,
                'errores'    => $errores,
            );
        } catch (Exception $e) {
            return array('success' => false, 'message' => 'Error al procesar el archivo: ' . $e->getMessage());
        }
    }

    public function obtenerUsuariosYEventosReferencia() {
        try {
            $stmtU = $this->conn->prepare(
                "SELECT u.usuario, u.nombre, u.apellido
                 FROM usuarios u
                 LEFT JOIN administradores a ON u.id = a.usuario_id AND a.activo = 1
                 WHERE a.id IS NULL
                 ORDER BY u.apellido, u.nombre ASC"
            );
            $stmtU->execute();

            $stmtE = $this->conn->prepare(
                "SELECT id, nombre_evento FROM eventos ORDER BY nombre_evento ASC"
            );
            $stmtE->execute();

            return array(
                'success'  => true,
                'usuarios' => $stmtU->fetchAll(PDO::FETCH_ASSOC),
                'eventos'  => $stmtE->fetchAll(PDO::FETCH_ASSOC),
            );
        } catch (PDOException $e) {
            return array('success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage());
        }
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private function procesarCSV($archivo) {
        try {
            $handle = fopen($archivo, 'r');
            if (!$handle) {
                return array('success' => false, 'message' => 'No se pudo abrir el archivo CSV');
            }

            $header = fgetcsv($handle);
            if (!$header || count($header) < 4) {
                fclose($handle);
                return array('success' => false, 'message' => 'El archivo CSV debe tener las columnas: nombre, apellido, usuario, contrasena');
            }

            $header = array_map('strtolower', array_map('trim', $header));
            foreach (['nombre', 'apellido', 'usuario', 'contrasena'] as $col) {
                if (!in_array($col, $header)) {
                    fclose($handle);
                    return array('success' => false, 'message' => "Columna requerida no encontrada: $col");
                }
            }

            $datos = array();
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) >= 4) {
                    $datos[] = array(
                        'nombre'     => trim($row[array_search('nombre',     $header)]),
                        'apellido'   => trim($row[array_search('apellido',   $header)]),
                        'usuario'    => trim($row[array_search('usuario',    $header)]),
                        'contrasena' => trim($row[array_search('contrasena', $header)]),
                    );
                }
            }
            fclose($handle);

            return array('success' => true, 'data' => $datos);
        } catch (Exception $e) {
            return array('success' => false, 'message' => 'Error al procesar CSV: ' . $e->getMessage());
        }
    }

    private function procesarExcel($archivo) {
        return array(
            'success' => false,
            'message' => 'Soporte para Excel será implementado próximamente. Por favor use archivos CSV.',
        );
    }
}