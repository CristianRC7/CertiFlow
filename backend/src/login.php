<?php
// Configuración de seguridad
error_reporting(0);
ini_set('display_errors', 0);

// Headers de seguridad
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Verificar método HTTP
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../conexion.php';

class Login {
    private $conn;
    private $table_name = "usuarios";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function authenticate($usuario, $contrasena) {
        try {
            // Primero verificar si el usuario existe
            $query_usuario = "SELECT u.id, u.nombre, u.apellido, u.usuario, u.contrasena, 
                                    CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as is_admin
                             FROM " . $this->table_name . " u
                             LEFT JOIN administradores a ON u.id = a.usuario_id AND a.activo = 1
                             WHERE u.usuario = :usuario";
            
            $stmt_usuario = $this->conn->prepare($query_usuario);
            $stmt_usuario->bindParam(":usuario", $usuario);
            $stmt_usuario->execute();
            
            if($stmt_usuario->rowCount() == 0) {
                return array(
                    "success" => false,
                    "message" => "El usuario no existe",
                    "error_type" => "user_not_found"
                );
            }
            
            // Si el usuario existe, verificar la contraseña
            $row = $stmt_usuario->fetch(PDO::FETCH_ASSOC);
            $contrasena_hash = md5($contrasena);
            
            if($row['contrasena'] !== $contrasena_hash) {
                return array(
                    "success" => false,
                    "message" => "Contraseña incorrecta",
                    "error_type" => "wrong_password"
                );
            }
            
            // Si llegamos aquí, la autenticación es exitosa
            return array(
                "success" => true,
                "message" => "Sesión iniciada correctamente",
                "user" => array(
                    "id" => $row['id'],
                    "nombre" => $row['nombre'],
                    "apellido" => $row['apellido'],
                    "usuario" => $row['usuario'],
                    "is_admin" => (bool)$row['is_admin']
                )
            );
            
        } catch(PDOException $e) {
            return array(
                "success" => false,
                "message" => "Error en la base de datos: " . $e->getMessage(),
                "error_type" => "database_error"
            );
        }
    }
}

// Manejar la solicitud
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        $login = new Login($db);
        
        // Obtener y validar datos del POST
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "Datos JSON inválidos"
            ));
            exit;
        }
        
        if (!isset($data['usuario']) || !isset($data['contrasena'])) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "Datos incompletos"
            ));
            exit;
        }
        
        // Sanitizar y validar datos
        $usuario = filter_var($data['usuario'], FILTER_SANITIZE_STRING);
        $contrasena = $data['contrasena'];
        
        if (empty($usuario) || strlen($usuario) > 50) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "Usuario inválido"
            ));
            exit;
        }
        
        if (empty($contrasena) || strlen($contrasena) > 100) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "Contraseña inválida"
            ));
            exit;
        }
        
        $result = $login->authenticate($usuario, $contrasena);
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            "success" => false,
            "message" => "Error interno del servidor"
        ));
    }
} else {
    http_response_code(405);
    echo json_encode(array(
        "success" => false,
        "message" => "Método no permitido"
    ));
}
?>
