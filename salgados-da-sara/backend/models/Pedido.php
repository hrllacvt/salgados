<?php
class Pedido {
    private $conn;
    private $table_name = "pedido";
    
    // Constantes para status
    const STATUS_PENDENTE = 1;
    const STATUS_CONFIRMADO = 2;
    const STATUS_PRONTO = 3;
    const STATUS_ENTREGUE = 4;
    const STATUS_REJEITADO = 5;
    
    // Constantes para forma de pagamento
    const PAGAMENTO_DINHEIRO = 1;
    const PAGAMENTO_CARTAO = 2;
    const PAGAMENTO_PIX = 3;
    
    // Constantes para forma de entrega
    const ENTREGA_RETIRADA = 1;
    const ENTREGA_DELIVERY = 2;

    public $codigo;
    public $numero_pedido;
    public $valor;
    public $status;
    public $forma_pagamento;
    public $forma_entrega;
    public $data_pedido;
    public $data_entrega;
    public $codigo_cliente;
    public $observacoes;
    public $codigo_pedido;

    // Métodos para conversão de status
    public static function getStatusCode($status) {
        $statusMap = [
            'pendente' => self::STATUS_PENDENTE,
            'confirmado' => self::STATUS_CONFIRMADO,
            'pronto' => self::STATUS_PRONTO,
            'entregue' => self::STATUS_ENTREGUE,
            'rejeitado' => self::STATUS_REJEITADO
        ];
        return $statusMap[$status] ?? self::STATUS_PENDENTE;
    }
    
    public static function getStatusText($code) {
        $statusMap = [
            self::STATUS_PENDENTE => 'pendente',
            self::STATUS_CONFIRMADO => 'confirmado',
            self::STATUS_PRONTO => 'pronto',
            self::STATUS_ENTREGUE => 'entregue',
            self::STATUS_REJEITADO => 'rejeitado'
        ];
        return $statusMap[$code] ?? 'pendente';
    }
    
    public static function getPaymentCode($payment) {
        $paymentMap = [
            'dinheiro' => self::PAGAMENTO_DINHEIRO,
            'cartao' => self::PAGAMENTO_CARTAO,
            'pix' => self::PAGAMENTO_PIX
        ];
        return $paymentMap[$payment] ?? self::PAGAMENTO_DINHEIRO;
    }
    
    public static function getPaymentText($code) {
        $paymentMap = [
            self::PAGAMENTO_DINHEIRO => 'dinheiro',
            self::PAGAMENTO_CARTAO => 'cartao',
            self::PAGAMENTO_PIX => 'pix'
        ];
        return $paymentMap[$code] ?? 'dinheiro';
    }
    
    public static function getDeliveryCode($delivery) {
        $deliveryMap = [
            'retirada' => self::ENTREGA_RETIRADA,
            'entrega' => self::ENTREGA_DELIVERY
        ];
        return $deliveryMap[$delivery] ?? self::ENTREGA_RETIRADA;
    }
    
    public static function getDeliveryText($code) {
        $deliveryMap = [
            self::ENTREGA_RETIRADA => 'retirada',
            self::ENTREGA_DELIVERY => 'entrega'
        ];
        return $deliveryMap[$code] ?? 'retirada';
    }
    public function __construct($db) {
        $this->conn = $db;
    }

    // Criar pedido
    function create($itens) {
        try {
            $this->conn->beginTransaction();

            // Gerar número do pedido se não fornecido
            if(empty($this->numero_pedido)) {
                $this->numero_pedido = $this->generateOrderNumber();
            }

            // Criar o pedido
            $query = "INSERT INTO " . $this->table_name . " 
                      (numero_pedido, valor, status, forma_pagamento, forma_entrega, codigo_cliente, observacoes) 
                      VALUES (:numero_pedido, :valor, :status, :forma_pagamento, :forma_entrega, :codigo_cliente, :observacoes)";

            $stmt = $this->conn->prepare($query);

            // Sanitizar
            $this->numero_pedido = htmlspecialchars(strip_tags($this->numero_pedido));
            $this->forma_pagamento = self::getPaymentCode($this->forma_pagamento);
            $this->forma_entrega = self::getDeliveryCode($this->forma_entrega);
            $this->status = self::getStatusCode($this->status ?? 'pendente');

            // Bind values
            $stmt->bindParam(":numero_pedido", $this->numero_pedido);
            $stmt->bindParam(":valor", $this->valor);
            $stmt->bindParam(":status", $this->status, PDO::PARAM_INT);
            $stmt->bindParam(":forma_pagamento", $this->forma_pagamento, PDO::PARAM_INT);
            $stmt->bindParam(":forma_entrega", $this->forma_entrega, PDO::PARAM_INT);
            $stmt->bindParam(":codigo_cliente", $this->codigo_cliente);
            $stmt->bindParam(":observacoes", $this->observacoes);

            if(!$stmt->execute()) {
                throw new Exception("Erro ao criar pedido");
            }

            $this->codigo = $this->conn->lastInsertId();

            // Inserir itens do pedido
            foreach($itens as $item) {
                $item_query = "INSERT INTO pedido_produto 
                              (codigo_pedido, codigo_produto, quantidade, preco_unitario, tipo_quantidade, quantidade_unidades) 
                              VALUES (:codigo_pedido, :codigo_produto, :quantidade, :preco_unitario, :tipo_quantidade, :quantidade_unidades)";

                $item_stmt = $this->conn->prepare($item_query);
                $item_stmt->bindParam(":codigo_pedido", $this->codigo);
                $item_stmt->bindParam(":codigo_produto", $item['codigo_produto']);
                $item_stmt->bindParam(":quantidade", $item['quantidade']);
                $item_stmt->bindParam(":preco_unitario", $item['preco_unitario']);
                $item_stmt->bindParam(":tipo_quantidade", $item['tipo_quantidade']);
                $item_stmt->bindParam(":quantidade_unidades", $item['quantidade_unidades']);

                if(!$item_stmt->execute()) {
                    throw new Exception("Erro ao inserir item do pedido");
                }
            }

            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Erro ao criar pedido: " . $e->getMessage());
            return false;
        }
    }

    // Ler todos os pedidos
    function readAll() {
        $query = "SELECT p.*, c.nome as nome_cliente, c.telefone as telefone_cliente,
                         ci.nome as cidade_nome
                  FROM " . $this->table_name . " p
                  LEFT JOIN cliente c ON p.codigo_cliente = c.codigo
                  LEFT JOIN cidade ci ON c.sigla_cidade = ci.sigla
                  ORDER BY p.data_pedido DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt;
    }

    // Ler pedidos por cliente
    function readByCliente($codigo_cliente) {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE codigo_cliente = :codigo_cliente 
                  ORDER BY data_pedido DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo_cliente", $codigo_cliente);
        $stmt->execute();

        return $stmt;
    }

    // Ler um pedido com itens
    function readOne() {
        $query = "SELECT p.*, c.nome as nome_cliente, c.telefone as telefone_cliente,
                         e.rua, e.numero, e.complemento, e.bairro,
                         ci.nome as cidade_nome
                  FROM " . $this->table_name . " p
                  LEFT JOIN cliente c ON p.codigo_cliente = c.codigo
                  LEFT JOIN endereco e ON c.codigo_endereco = e.codigo
                  LEFT JOIN cidade ci ON c.sigla_cidade = ci.sigla
                  WHERE p.codigo = :codigo";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo", $this->codigo);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->numero_pedido = $row['numero_pedido'];
            $this->valor = $row['valor'];
            $this->status = $row['status'];
            $this->forma_pagamento = $row['forma_pagamento'];
            $this->forma_entrega = $row['forma_entrega'];
            $this->data_pedido = $row['data_pedido'];
            $this->data_entrega = $row['data_entrega'];
            $this->codigo_cliente = $row['codigo_cliente'];
            $this->observacoes = $row['observacoes'];
            
            return true;
        }

        return false;
    }

    // Obter itens do pedido
    function getItens() {
        $query = "SELECT pp.*, pr.nome, pr.sabor, c.nome_categoria
                  FROM pedido_produto pp
                  JOIN produto pr ON pp.codigo_produto = pr.codigo
                  LEFT JOIN categoria c ON pr.codigo_categoria = c.codigo
                  WHERE pp.codigo_pedido = :codigo";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo", $this->codigo);
        $stmt->execute();

        return $stmt;
    }

    // Atualizar status do pedido
    function updateStatus($novo_status_text, $observacoes = null) {
        $novo_status = self::getStatusCode($novo_status_text);
        
        $query = "UPDATE " . $this->table_name . " 
                  SET status = :status";
        
        if($observacoes) {
            $query .= ", observacoes = :observacoes";
        }
        
        if($novo_status === self::STATUS_ENTREGUE) {
            $query .= ", data_entrega = CURRENT_TIMESTAMP";
        }
        
        $query .= " WHERE codigo = :codigo";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $novo_status, PDO::PARAM_INT);
        $stmt->bindParam(":codigo", $this->codigo);
        
        if($observacoes) {
            $stmt->bindParam(":observacoes", $observacoes);
        }

        if($stmt->execute()) {
            $this->status = $novo_status_text;
            if($observacoes) {
                $this->observacoes = $observacoes;
            }
            return true;
        }

        return false;
    }

    // Excluir pedido
    function delete() {
        try {
            $this->conn->beginTransaction();

            // Verificar se o pedido existe
            if(!$this->readOne()) {
                throw new Exception("Pedido não encontrado");
            }

            // Excluir delivery se existir (CASCADE já cuida disso)
            // Excluir itens do pedido (CASCADE já cuida disso)
            
            // Excluir o pedido
            $query = "DELETE FROM " . $this->table_name . " WHERE codigo = :codigo";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":codigo", $this->codigo);

            if($stmt->execute()) {
                $this->conn->commit();
                return true;
            }

            throw new Exception("Erro ao excluir pedido");

        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Erro ao excluir pedido: " . $e->getMessage());
            return false;
        }
    }

    // Criar delivery se necessário
    function createDelivery($endereco_entrega, $sigla_cidade, $hora_delivery = null) {
        $query = "INSERT INTO delivery (endereco, codigo_pedido, sigla_cidade, hora_delivery, codigo_preco) 
                  VALUES (:endereco, :codigo_pedido, :sigla_cidade, :hora_delivery, 
                         (SELECT codigo FROM preco_delivery WHERE valor = 10.00 LIMIT 1))";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":endereco", $endereco_entrega);
        $stmt->bindParam(":codigo_pedido", $this->codigo);
        $stmt->bindParam(":sigla_cidade", $sigla_cidade);
        $stmt->bindParam(":hora_delivery", $hora_delivery);

        return $stmt->execute();
    }

    // Gerar número do pedido
    private function generateOrderNumber() {
        $query = "SELECT COUNT(*) as count FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $numeroPedido = $row['count'] + 1;
        $data = date('dmY');
        
        return sprintf("#%03d-%s", $numeroPedido, $data);
    }
}
?>