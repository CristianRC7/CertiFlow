<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

require_once '../conexion.php';

class Certificados {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function obtenerCertificadosUsuario($usuario_id) {
        try {
            $query = "SELECT 
                        p.nro_certificado,
                        p.evento_id,
                        p.estado_pago,
                        e.nombre_evento,
                        e.imagen_certificado,
                        u.nombre,
                        u.apellido
                      FROM participaciones p
                      INNER JOIN eventos e ON p.evento_id = e.id
                      INNER JOIN usuarios u ON p.usuario_id = u.id
                      WHERE p.usuario_id = :usuario_id
                      ORDER BY e.nombre_evento ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":usuario_id", $usuario_id);
            $stmt->execute();
            
            $certificados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($certificados) > 0) {
                return array(
                    "success" => true,
                    "certificados" => $certificados,
                    "total" => count($certificados)
                );
            } else {
                return array(
                    "success" => true,
                    "certificados" => [],
                    "total" => 0,
                    "message" => "No se encuentra con certificados"
                );
            }
        } catch(PDOException $e) {
            return array(
                "success" => false,
                "message" => "Error en la base de datos: " . $e->getMessage()
            );
        }
    }
}

// Manejar la solicitud
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    $certificados = new Certificados($db);
    
    // Obtener datos del POST
    $data = json_decode(file_get_contents("php://input"), true);
    
    if(isset($data['usuario_id'])) {
        $result = $certificados->obtenerCertificadosUsuario($data['usuario_id']);
        echo json_encode($result);
    } else {
        echo json_encode(array(
            "success" => false,
            "message" => "ID de usuario requerido"
        ));
    }
} else {
    echo json_encode(array(
        "success" => false,
        "message" => "Método no permitido"
    ));
}
?> 