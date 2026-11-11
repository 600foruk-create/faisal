<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Karachi');

function round_money(float $val): float
{
    return round($val + 1e-9, 2);
}

function get_db_config(): ?array
{
    $localFile = __DIR__ . '/config.local.php';
    if (is_file($localFile)) {
        $cfg = require $localFile;
        if (is_array($cfg) && !empty($cfg['database']) && !empty($cfg['username'])) {
            return $cfg;
        }
    }

    $envHost = getenv('DB_HOST') ?: '';
    $envDb = getenv('DB_NAME') ?: '';
    $envUser = getenv('DB_USER') ?: '';
    $envPass = getenv('DB_PASS');
    if ($envDb !== '' && $envUser !== '' && $envPass !== false) {
        return [
            'host' => $envHost !== '' ? $envHost : '127.0.0.1',
            'database' => $envDb,
            'username' => $envUser,
            'password' => $envPass,
        ];
    }

    return null;
}

function create_pdo_from_config(array $cfg): PDO
{
    $host = trim((string)($cfg['host'] ?? '127.0.0.1'));
    if ($host === '') {
        $host = '127.0.0.1';
    }
    $dbName = trim((string)$cfg['database']);
    $username = trim((string)$cfg['username']);
    $password = (string)($cfg['password'] ?? '');

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $dbName);
    return new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function ensure_mysql_schema(PDO $pdo): void
{
    $schemaPath = __DIR__ . '/schema_mysql.sql';
    $sql = file_get_contents($schemaPath);
    if ($sql === false) {
        throw new RuntimeException('Missing schema_mysql.sql');
    }
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $stmt) {
        if ($stmt !== '') {
            $pdo->exec($stmt);
        }
    }
}

function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = get_db_config();
    if ($cfg === null) {
        throw new RuntimeException('DATABASE_NOT_CONFIGURED');
    }

    $pdo = create_pdo_from_config($cfg);
    $check = $pdo->query("SHOW TABLES LIKE 'branches'")->fetchColumn();
    if (!$check) {
        ensure_mysql_schema($pdo);
    }
    seed_initial_mysql_data($pdo);
    return $pdo;
}
