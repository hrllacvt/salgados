<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Erro de conexão com banco de dados');
    }

    $method = $_SERVER['REQUEST_METHOD'];

    switch($method) {
        case 'GET':
            $key = isset($_GET['key']) ? $_GET['key'] : null;
            
            if($key === 'taxa_entrega') {
                $query = "SELECT valor FROM preco_delivery WHERE descricao = 'Taxa padrão de entrega' LIMIT 1";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                if($stmt->rowCount() > 0) {
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);
                    http_response_code(200);
                    echo json_encode(array(
                        "sucesso" => true,
                        "dados" => array("taxa_entrega" => $row['valor'])
                    ));
                } else {
                    http_response_code(200);
                    echo json_encode(array(
                        "sucesso" => true,
                        "dados" => array("taxa_entrega" => "10.00")
                    ));
                }
            } else {
                http_response_code(200);
                echo json_encode(array(
                    "sucesso" => true,
                    "dados" => array(
                        "taxa_entrega" => "10.00",
                        "valor_minimo_pedido" => "50.00",
                        "endereco_loja" => "RUA IDA BERLET 1738 B",
                        "telefone_loja" => "(54) 99999-9999"
                    )
                ));
            }
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents("php://input"));
            
            if(!empty($data->key) && isset($data->value)) {
                
                if($data->key === 'taxa_entrega') {
                    $query = "UPDATE preco_delivery SET valor = :valor WHERE descricao = 'Taxa padrão de entrega'";
                    $stmt = $db->prepare($query);
                    $stmt->bindParam(":valor", $data->value);
                    
                    if($stmt->execute()) {
                        http_response_code(200);
                        echo json_encode(array(
                            "sucesso" => true,
                            "mensagem" => "Configuração atualizada com sucesso!"
                        ));
                    } else {
                        http_response_code(500);
                        echo json_encode(array(
                            "sucesso" => false,
                            "mensagem" => "Erro ao atualizar configuração"
                        ));
                    }
                } else {
                    http_response_code(200);
                    echo json_encode(array(
                        "sucesso" => true,
                        "mensagem" => "Configuração atualizada com sucesso!"
                    ));
                }
            } else {
                http_response_code(400);
                echo json_encode(array(
                    "sucesso" => false,
                    "mensagem" => "Chave e valor são obrigatórios"
                ));
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(array(
                "sucesso" => false,
                "mensagem" => "Método não permitido"
            ));
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>