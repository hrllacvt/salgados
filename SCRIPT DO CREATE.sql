-- Tabela cidade
CREATE TABLE cidade (
    sigla VARCHAR(5) NOT NULL,
    nome VARCHAR(100) NOT NULL UNIQUE,
	CONSTRAINT pk_cidade PRIMARY KEY (sigla)
);

-- Tabela endereco
CREATE TABLE endereco (
    codigo SERIAL NOT NULL,
    rua VARCHAR(255) NOT NULL,
    numero NUMERIC NOT NULL,
    cep VARCHAR(10),
    complemento VARCHAR(255),
    bairro VARCHAR(100),
	CONSTRAINT pk_endereco PRIMARY KEY (codigo)
);

-- Tabela categoria
CREATE TABLE categoria (
    codigo SERIAL NOT NULL,
    nome_categoria VARCHAR(100) NOT NULL UNIQUE,
    descricao_categoria TEXT,
	CONSTRAINT pk_categoria PRIMARY KEY (codigo)
);

-- Tabela preco_delivery
CREATE TABLE preco_delivery (
    codigo SERIAL NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao VARCHAR(255),
	CONSTRAINT pk_preco_delivery PRIMARY KEY (codigo)
);

-- Tabela cliente (antiga usuarios)
CREATE TABLE cliente (
    codigo SERIAL NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone NUMERIC UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    codigo_endereco INT NOT NULL,
    sigla_cidade VARCHAR(5) REFERENCES cidade(sigla),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_cliente PRIMARY KEY (codigo),
	CONSTRAINT fk_cliente_endereco FOREIGN KEY (codigo_endereco) REFERENCES endereco(codigo)
);

-- Tabela produto
CREATE TABLE produto (
    codigo SERIAL NOT NULL,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    sabor VARCHAR(100),
    codigo_categoria INT,
    eh_porcionado BOOLEAN DEFAULT FALSE,
    eh_personalizado BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_produto PRIMARY KEY (codigo),
	CONSTRAINT fk_produto_categoria FOREIGN KEY (codigo_categoria) REFERENCES categoria(codigo)

);

-- Tabela pedido com SMALLINT para status, forma_pagamento e forma_entrega
CREATE TABLE pedido (
    codigo SERIAL NOT NULL,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status SMALLINT DEFAULT 1, -- 1=pendente, 2=confirmado, 3=pronto, 4=entregue, 5=rejeitado
    forma_pagamento SMALLINT DEFAULT 1, -- 1=dinheiro, 2=cartao, 3=pix
    forma_entrega SMALLINT DEFAULT 1, -- 1=retirada, 2=entrega
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_entrega TIMESTAMP,
    codigo_cliente INT,
    observacoes TEXT,
	CONSTRAINT pk_pedido PRIMARY KEY (codigo),
	CONSTRAINT fk_pedido_cliente FOREIGN KEY (codigo_cliente) REFERENCES cliente(codigo),
	CONSTRAINT chk_status CHECK (status IN (1, 2, 3, 4, 5)),
	CONSTRAINT chk_forma_pagamento CHECK (forma_pagamento IN (1, 2, 3)),
	CONSTRAINT chk_forma_entrega CHECK (forma_entrega IN (1, 2))
);

-- Tabela pedido_produto (relacionamento N:N)
CREATE TABLE pedido_produto (
    codigo_pedido INT NOT NULL,
    codigo_produto INT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL,
    tipo_quantidade VARCHAR(20) DEFAULT 'cento',
    quantidade_unidades INTEGER DEFAULT 1,
    CONSTRAINT pk_pedido_produto PRIMARY KEY (codigo_pedido, codigo_produto, tipo_quantidade, quantidade_unidades),
	CONSTRAINT fk_pedido_produto_pedido FOREIGN KEY (codigo_pedido) REFERENCES pedido(codigo) ON DELETE CASCADE,
	CONSTRAINT fk_pedido_produto_produto FOREIGN KEY (codigo_produto) REFERENCES produto(codigo)
);

-- Tabela delivery
CREATE TABLE delivery (
    codigo SERIAL NOT NULL,
    hora_delivery TIME,
    endereco TEXT NOT NULL,
    codigo_pedido INT NOT NULL,
    sigla_cidade VARCHAR(5),
    codigo_preco INT,
	CONSTRAINT pk_delivery PRIMARY KEY (codigo),
	CONSTRAINT fk_delivery_pedido FOREIGN KEY (codigo_pedido) REFERENCES pedido(codigo) ON DELETE CASCADE,
	CONSTRAINT fk_delivery_cidade FOREIGN KEY (sigla_cidade) REFERENCES cidade(sigla),
	CONSTRAINT fk_delivery_preco_delivery FOREIGN KEY (codigo_preco) REFERENCES preco_delivery(codigo)
	
);

-- Tabela admin
CREATE TABLE admin (
    codigo SERIAL NOT NULL,
    login VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    super_admin BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_admin PRIMARY KEY (codigo)
);

-- Inserir dados iniciais

-- Cidades atendidas (incluindo Ibirubá)
INSERT INTO cidade (sigla, nome) VALUES
('QN', 'Quinze de Novembro'),
('SB', 'Selbach'),
('CO', 'Colorado'),
('AA', 'Alto Alegre'),
('FV', 'Fortaleza dos Valos'),
('TP', 'Tapera'),
('LTC', 'Lagoa dos Três Cantos'),
('SM', 'Saldanha Marinho'),
('EP', 'Espumoso'),
('CB', 'Campos Borges'),
('SBS', 'Santa Bárbara do Sul'),
('NMT', 'Não-Me-Toque'),
('BVC', 'Boa Vista do Cadeado'),
('BVI', 'Boa Vista do Incra'),
('CZ', 'Carazinho'),
('IB', 'Ibirubá')
ON CONFLICT (sigla) DO NOTHING;

-- Categorias de produtos
INSERT INTO categoria (nome_categoria, descricao_categoria) VALUES
('Salgados Fritos', 'Salgados tradicionais fritos'),
('Sortidos', 'Mix de salgados variados'),
('Assados', 'Produtos assados no forno'),
('Especiais', 'Produtos especiais e tortas'),
('Opcionais', 'Bebidas e acompanhamentos')
ON CONFLICT (nome_categoria) DO NOTHING;

-- Preços de delivery
INSERT INTO preco_delivery (valor, descricao) VALUES
(10.00, 'Taxa padrão de entrega'),
(15.00, 'Taxa para cidades mais distantes'),
(0.00, 'Entrega gratuita para pedidos acima de R$ 100,00')
ON CONFLICT DO NOTHING;

-- Produtos padrão
INSERT INTO produto (nome, preco, sabor, codigo_categoria, eh_porcionado, eh_personalizado) VALUES
('Coxinha', 110.00, 'Frango', 1, false, false),
('Coxinha', 120.00, 'Frango com Catupiry', 1, false, false),
('Bolinha de Queijo', 100.00, 'Queijo', 1, false, false),
('Risole', 130.00, 'Camarão', 1, false, false),
('Pastel', 90.00, 'Carne', 1, false, false),
('Pastel', 85.00, 'Queijo', 1, false, false),
('Enroladinho de Salsicha', 95.00, 'Salsicha', 1, false, false),
('Sortido Simples', 95.00, 'Variado', 2, false, false),
('Sortido Especial', 110.00, 'Variado Premium', 2, false, false),
('Pão de Açúcar', 100.00, 'Doce', 3, false, false),
('Pão de Batata', 105.00, 'Batata', 3, false, false),
('Esfirra', 120.00, 'Carne', 3, false, false),
('Esfirra', 115.00, 'Queijo', 3, false, false),
('Torta Salgada', 25.00, 'Variado', 4, true, false),
('Quiche', 20.00, 'Variado', 4, true, false),
('Refrigerante Lata', 5.00, 'Variado', 5, true, false),
('Suco Natural', 8.00, 'Variado', 5, true, false)
ON CONFLICT DO NOTHING;

-- Administrador padrão
INSERT INTO admin (login, senha, super_admin) 
VALUES ('sara', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true)
ON CONFLICT (login) DO NOTHING;
-- Senha padrão: password
