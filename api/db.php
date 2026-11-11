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

function create_sqlite_pdo(): PDO
{
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0755, true);
    }
    $dbPath = (is_dir($dataDir) && is_writable($dataDir))
        ? ($dataDir . '/pos.db')
        : (rtrim(sys_get_temp_dir(), '/\\') . '/seastone_pos.db');

    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL;');
    $pdo->exec('PRAGMA foreign_keys = ON;');
    return $pdo;
}

function is_sqlite_pdo(PDO $pdo): bool
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
}

function ensure_database_schema(PDO $pdo): void
{
    $schemaFile = is_sqlite_pdo($pdo) ? (__DIR__ . '/schema_sqlite.sql') : (__DIR__ . '/schema_mysql.sql');
    $sql = file_get_contents($schemaFile);
    if ($sql === false) {
        throw new RuntimeException('Missing schema SQL file');
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
    if ($cfg !== null) {
        try {
            $pdo = create_pdo_from_config($cfg);
        } catch (Throwable $e) {
            $pdo = null;
        }
    }

    if ($pdo === null) {
        $pdo = create_sqlite_pdo();
    }

    if (is_sqlite_pdo($pdo)) {
        $check = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='branches'")->fetchColumn();
    } else {
        $check = $pdo->query("SHOW TABLES LIKE 'branches'")->fetchColumn();
    }

    if (!$check) {
        ensure_database_schema($pdo);
    }
    seed_initial_mysql_data($pdo);
    return $pdo;
}
