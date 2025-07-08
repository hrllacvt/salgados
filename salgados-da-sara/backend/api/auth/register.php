<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    include_once '../../config/database.php';
    include_once '../../models/Cliente.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception('Falha na conexão com banco de dados');
    }

    $cliente = new Cliente($db);

    $input = file_get_contents("php://input");
    $data = json_decode($input);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido recebido');
    }

    $required_fields = ['name', 'phone', 'email', 'address', 'number', 'city', 'password', 'confirmPassword'];
    $errors = array();

    foreach($required_fields as $field) {
        if(empty($data->$field)) {
            $field_names = [
                'name' => 'Nome',
                'phone' => 'Telefone', 
                'email' => 'Email',
                'address' => 'Endereço',
                'number' => 'Número',
                'city' => 'Cidade',
                'password' => 'Senha',
                'confirmPassword' => 'Confirmação de Senha'
            ];
            $errors[$field] = $field_names[$field] . " é obrigatório";
        }
    }

    // Formato de email
    if(!empty($data->email) && !filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = "Email inválido";
    }

    // tamanho senha
    if(!empty($data->password) && strlen($data->password) < 6) {
        $errors['password'] = "Senha deve ter pelo menos 6 caracteres";
    }

    // senha ta certa
    if(!empty($data->password) && !empty($data->confirmPassword) && $data->password !== $data->confirmPassword) {
        $errors['confirmPassword'] = "Senhas não coincidem";
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

    $sigla_cidade = $cidades_map[$data->city] ?? null;
    if(!$sigla_cidade) {
        $errors['city'] = "Cidade não atendida";
    }

    // usuario ja existe
    if(empty($errors)) {
        $cliente->telefone = $data->phone;
        $cliente->email = $data->email;
        
        if($cliente->clienteExists()) {
            $errors['general'] = "Usuário já cadastrado com este telefone ou email";
        }
    }

    if(!empty($errors)) {
        http_response_code(400);
        echo json_encode(array(
            "sucesso" => false,
            "erros" => $errors
        ));
    } else {
        $cliente->nome = $data->name;
        $cliente->telefone = $data->phone;
        $cliente->email = $data->email;
        $cliente->rua = $data->address;
        $cliente->numero = $data->number;
        $cliente->complemento = $data->complement ?? '';
        $cliente->bairro = $data->neighborhood ?? '';
        $cliente->cep = $data->cep ?? '';
        $cliente->sigla_cidade = $sigla_cidade;
        $cliente->senha = $data->password;

        if($cliente->create()) {
            $cliente->readOne();
            
            $response = array(
                "sucesso" => true,
                "mensagem" => "Conta criada com sucesso!",
                "usuario" => array(
                    "id" => $cliente->codigo,
                    "nome" => $cliente->nome,
                    "telefone" => $cliente->telefone,
                    "email" => $cliente->email,
                    "endereco" => $cliente->rua,
                    "numero" => $cliente->numero,
                    "complemento" => $cliente->complemento,
                    "cidade" => $cliente->sigla_cidade,
                    "bairro" => $cliente->bairro,
                    "cep" => $cliente->cep,
                    "criado_em" => $cliente->criado_em
                )
            );
            
            http_response_code(201);
            echo json_encode($response);
        } else {
            http_response_code(500);
            echo json_encode(array(
                "sucesso" => false,
                "mensagem" => "Erro ao criar conta"
            ));
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>