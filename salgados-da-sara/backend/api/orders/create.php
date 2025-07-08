<?php
include_once '../../config/cors.php';
include_once '../../config/database.php';
include_once '../../models/Pedido.php';

$database = new Database();
$db = $database->getConnection();

$pedido = new Pedido($db);

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->user_id) && !empty($data->items) && !empty($data->total)) {
    
    $pedido->codigo_cliente = $data->user_id;
    $pedido->valor = $data->total;
    $pedido->forma_pagamento = $data->payment_method ?? 'dinheiro';
    $pedido->forma_entrega = $data->is_delivery ? 'entrega' : 'retirada';
    $pedido->status = 'pendente';
    $pedido->observacoes = $data->notes ?? '';

    // Converter itens para o formato do banco
    $itens = array();
    foreach($data->items as $item) {
        $itens[] = array(
            'codigo_produto' => $item->id,
            'quantidade' => $item->quantity ?? 1,
            'preco_unitario' => $item->totalPrice / ($item->quantity ?? 1),
            'tipo_quantidade' => $item->quantityType ?? 'cento',
            'quantidade_unidades' => $item->unitCount ?? 1
        );
    }

    if($pedido->create($itens)) {
        
        // Se for entrega, criar registro de delivery
        if($data->is_delivery && !empty($data->customer_data)) {
            $endereco_entrega = $data->customer_data->address . ', ' . $data->customer_data->number;
            if($data->customer_data->complement) {
                $endereco_entrega .= ', ' . $data->customer_data->complement;
            }
            
            // Mapear cidade para sigla
            $cidades_map = [
                'Quinze de Novembro' => 'QN',
                'Selbach' => 'SB',
                'Colorado' => 'CO',
                'Alto Alegre' => 'AA',
                'Fortaleza dos Valos' => 'FV',
                'Tapera' => 'TP',
                'Lagoa dos Três Cantos' => 'LTC',
                'Saldanha Marinho' => 'SM',
                'Espumoso' => 'EP',
                'Campos Borges' => 'CB',
                'Santa Bárbara do Sul' => 'SBS',
                'Não-Me-Toque' => 'NMT',
                'Boa Vista do Cadeado' => 'BVC',
                'Boa Vista do Incra' => 'BVI',
                'Carazinho' => 'CZ',
                'Ibirubá' => 'IB'
            ];
            
            $sigla_cidade = $cidades_map[$data->customer_data->city] ?? 'QN';
            
            $pedido->createDelivery($endereco_entrega, $sigla_cidade);
        }
        
        http_response_code(201);
        echo json_encode(array(
            "sucesso" => true,
            "mensagem" => "Pedido criado com sucesso!",
            "codigo" => $pedido->codigo,
            "numero_pedido" => $pedido->numero_pedido
        ));
    } else {
        http_response_code(500);
        echo json_encode(array(
            "sucesso" => false,
            "mensagem" => "Erro ao criar pedido"
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "sucesso" => false,
        "mensagem" => "Dados incompletos"
    ));
}
?>