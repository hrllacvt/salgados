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
    include_once '../../models/Pedido.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Erro de conexão com banco de dados');
    }

    $pedido = new Pedido($db);

    $codigo_cliente = isset($_GET['user_id']) ? $_GET['user_id'] : null;

    if($codigo_cliente) {
        $stmt = $pedido->readByCliente($codigo_cliente);
    } else {
        $stmt = $pedido->readAll();
    }

    $num = $stmt->rowCount();

    if($num > 0) {
        $orders_arr = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            extract($row);
            
            // Converter códigos para texto
            $status_text = Pedido::getStatusText($status);
            $forma_pagamento_text = Pedido::getPaymentText($forma_pagamento);
            $forma_entrega_text = Pedido::getDeliveryText($forma_entrega);
            
            // Obter itens do pedido
            $pedido->codigo = $codigo;
            $itens_stmt = $pedido->getItens();
            $itens = array();
            
            while($item_row = $itens_stmt->fetch(PDO::FETCH_ASSOC)) {
                $itens[] = array(
                    "id" => $item_row['codigo'],
                    "nome" => $item_row['sabor'] ? $item_row['nome'] . ' - ' . $item_row['sabor'] : $item_row['nome'],
                    "quantity" => intval($item_row['quantidade']),
                    "quantityType" => $item_row['tipo_quantidade'],
                    "unitCount" => intval($item_row['quantidade_unidades']),
                    "totalPrice" => floatval($item_row['preco_unitario'] * $item_row['quantidade'])
                );
            }
            
            $order_item = array(
                "id" => $codigo,
                "numero_pedido" => $numero_pedido,
                "usuario_id" => $codigo_cliente,
                "dados_cliente" => array(
                    "name" => $nome_cliente ?? '',
                    "phone" => $telefone_cliente ?? '',
                    "city" => $cidade_nome ?? ''
                ),
                "itens" => $itens,
                "subtotal" => floatval($valor),
                "taxa_entrega" => $forma_entrega == Pedido::ENTREGA_DELIVERY ? 10.00 : 0.00,
                "total" => floatval($valor),
                "eh_entrega" => $forma_entrega == Pedido::ENTREGA_DELIVERY,
                "metodo_pagamento" => $forma_pagamento_text,
                "status" => $status_text,
                "motivo_rejeicao" => $observacoes,
                "criado_em" => $data_pedido
            );
            
            array_push($orders_arr, $order_item);
        }
        
        http_response_code(200);
        echo json_encode(array(
            "sucesso" => true,
            "dados" => $orders_arr
        ));
    } else {
        http_response_code(200);
        echo json_encode(array(
            "sucesso" => true,
            "dados" => array()
        ));
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>