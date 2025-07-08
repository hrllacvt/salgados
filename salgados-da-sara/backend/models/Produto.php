<?php
class Produto {
    private $conn;
    private $table_name = "produto";

    public $codigo;
    public $nome;
    public $preco;
    public $sabor;
    public $codigo_categoria;
    public $eh_porcionado;
    public $eh_personalizado;
    public $criado_em;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Criar produto
    function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  (nome, preco, sabor, codigo_categoria, eh_porcionado, eh_personalizado) 
                  VALUES (:nome, :preco, :sabor, :codigo_categoria, :eh_porcionado, :eh_personalizado)";

        $stmt = $this->conn->prepare($query);

        // Sanitizar
        $this->nome = htmlspecialchars(strip_tags($this->nome));
        $this->sabor = htmlspecialchars(strip_tags($this->sabor));
        $this->eh_porcionado = $this->eh_porcionado ?? false;
        $this->eh_personalizado = $this->eh_personalizado ?? true;

        // Bind values
        $stmt->bindParam(":nome", $this->nome);
        $stmt->bindParam(":preco", $this->preco);
        $stmt->bindParam(":sabor", $this->sabor);
        $stmt->bindParam(":codigo_categoria", $this->codigo_categoria);
        $stmt->bindParam(":eh_porcionado", $this->eh_porcionado, PDO::PARAM_BOOL);
        $stmt->bindParam(":eh_personalizado", $this->eh_personalizado, PDO::PARAM_BOOL);

        if($stmt->execute()) {
            $this->codigo = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    // Ler todos os produtos
    function readAll() {
        $query = "SELECT p.codigo, p.nome, p.preco, p.sabor, p.eh_porcionado, 
                         p.eh_personalizado, p.criado_em,
                         c.nome_categoria, c.descricao_categoria
                  FROM " . $this->table_name . " p
                  LEFT JOIN categoria c ON p.codigo_categoria = c.codigo
                  ORDER BY c.nome_categoria, p.nome, p.sabor";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt;
    }

    // Ler um produto
    function readOne() {
        $query = "SELECT p.codigo, p.nome, p.preco, p.sabor, p.eh_porcionado, 
                         p.eh_personalizado, p.criado_em, p.codigo_categoria,
                         c.nome_categoria, c.descricao_categoria
                  FROM " . $this->table_name . " p
                  LEFT JOIN categoria c ON p.codigo_categoria = c.codigo
                  WHERE p.codigo = :codigo";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo", $this->codigo);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->nome = $row['nome'];
            $this->preco = $row['preco'];
            $this->sabor = $row['sabor'];
            $this->codigo_categoria = $row['codigo_categoria'];
            $this->eh_porcionado = $row['eh_porcionado'];
            $this->eh_personalizado = $row['eh_personalizado'];
            $this->criado_em = $row['criado_em'];
            return true;
        }

        return false;
    }

    // Atualizar produto
    function update() {
        $query = "UPDATE " . $this->table_name . " 
                  SET nome = :nome, preco = :preco, sabor = :sabor, 
                      codigo_categoria = :codigo_categoria, eh_porcionado = :eh_porcionado 
                  WHERE codigo = :codigo AND eh_personalizado = true";

        $stmt = $this->conn->prepare($query);

        $this->nome = htmlspecialchars(strip_tags($this->nome));
        $this->sabor = htmlspecialchars(strip_tags($this->sabor));
        $this->eh_porcionado = $this->eh_porcionado ?? false;

        $stmt->bindParam(":nome", $this->nome);
        $stmt->bindParam(":preco", $this->preco);
        $stmt->bindParam(":sabor", $this->sabor);
        $stmt->bindParam(":codigo_categoria", $this->codigo_categoria);
        $stmt->bindParam(":eh_porcionado", $this->eh_porcionado, PDO::PARAM_BOOL);
        $stmt->bindParam(":codigo", $this->codigo);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Excluir produto
    function delete() {
        $query = "DELETE FROM " . $this->table_name . " 
                  WHERE codigo = :codigo AND eh_personalizado = true";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":codigo", $this->codigo);

        if($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Obter categorias
    function getCategorias() {
        $query = "SELECT codigo, nome_categoria, descricao_categoria 
                  FROM categoria ORDER BY nome_categoria";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }
}
?>