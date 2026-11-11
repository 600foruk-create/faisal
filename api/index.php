<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/seed.php';
require_once __DIR__ . '/fbr.php';
require_once __DIR__ . '/pos_service.php';

header('Content-Type: application/json; charset=utf-8');

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function parse_opt_int($val): ?int
{
    if ($val === null || $val === '' || $val === 'ALL' || $val === 'all') {
        return null;
    }
    $num = (int)$val;
    return $num > 0 ? $num : null;
}

$route = trim((string)($_GET['route'] ?? ''), '/');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    if ($route === 'setup') {
        if ($method === 'GET') {
            $cfg = get_db_config();
            json_out([
                'configured' => $cfg !== null,
                'defaults' => [
                    'host' => '127.0.0.1',
                    'database' => 'u2456697138_faisal',
                    'username' => 'u2456697138_faisal',
                ],
            ]);
        }
        if ($method === 'POST') {
            if (get_db_config() !== null) {
                json_out(['ok' => true, 'alreadyConfigured' => true]);
            }
            $body = read_json_body();
            $host = trim((string)($body['host'] ?? '127.0.0.1')) ?: '127.0.0.1';
            $database = trim((string)($body['database'] ?? ''));
            $username = trim((string)($body['username'] ?? ''));
            $password = (string)($body['password'] ?? '');

            if ($database === '' || $username === '') {
                json_out(['error' => 'Database name and username are required'], 400);
            }

            $cfg = [
                'host' => $host,
                'database' => $database,
                'username' => $username,
                'password' => $password,
            ];

            try {
                $pdo = create_pdo_from_config($cfg);
            } catch (PDOException $firstErr) {
                $fallbackHost = $host === '127.0.0.1' ? 'localhost' : ($host === 'localhost' ? '127.0.0.1' : '');
                if ($fallbackHost !== '') {
                    $cfg['host'] = $fallbackHost;
                    $pdo = create_pdo_from_config($cfg);
                } else {
                    throw $firstErr;
                }
            }
            ensure_mysql_schema($pdo);
            seed_initial_mysql_data($pdo);

            $phpContent = "<?php\nreturn " . var_export($cfg, true) . ";\n";
            $written = @file_put_contents(__DIR__ . '/config.local.php', $phpContent, LOCK_EX);
            if ($written === false) {
                json_out([
                    'ok' => false,
                    'error' => 'Connected to MySQL and installed tables, but api/config.local.php is not writable.',
                    'manualConfig' => $phpContent,
                ], 500);
            }

            json_out(['ok' => true]);
        }
        json_out(['error' => 'Method not allowed'], 405);
    }

    // All other routes require configured MySQL DB
    try {
        $pdo = get_pdo();
    } catch (RuntimeException $e) {
        if ($e->getMessage() === 'DATABASE_NOT_CONFIGURED') {
            json_out([
                'needsSetup' => true,
                'defaults' => [
                    'host' => '127.0.0.1',
                    'database' => 'u2456697138_faisal',
                    'username' => 'u2456697138_faisal',
                ],
                'error' => 'Database is not configured yet.',
            ], 503);
        }
        throw $e;
    }

    if ($route === 'context') {
        if ($method === 'GET') {
            $bt = mysql_get_branches_with_terminals($pdo);
            json_out([
                'branches' => $bt['branches'],
                'terminals' => $bt['terminals'],
                'users' => mysql_get_users($pdo),
                'settings' => mysql_get_business_settings($pdo),
            ]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            $u = (string)($body['username'] ?? '');
            $p = (string)($body['password'] ?? '');
            if ($u === '' || $p === '') {
                json_out(['error' => 'Username and password are required'], 400);
            }
            $user = mysql_authenticate_user($pdo, $u, $p);
            if ($user === null) {
                json_out(['error' => 'Invalid username or password'], 401);
            }
            json_out(['user' => $user]);
        }
    }

    if ($route === 'dashboard' && $method === 'GET') {
        $today = date('Y-m-d');
        $branchId = parse_opt_int($_GET['branchId'] ?? null);
        $fromDate = !empty($_GET['fromDate']) ? (string)$_GET['fromDate'] : $today;
        $toDate = !empty($_GET['toDate']) ? (string)$_GET['toDate'] : $today;
        $limit = (int)($_GET['limit'] ?? 15) ?: 15;
        json_out(mysql_get_dashboard_summary($pdo, $branchId, $fromDate, $toDate, $limit));
    }

    if ($route === 'products') {
        if ($method === 'GET') {
            $products = mysql_get_products($pdo, [
                'branchId' => parse_opt_int($_GET['branchId'] ?? null),
                'search' => $_GET['search'] ?? '',
                'category' => $_GET['category'] ?? '',
                'includeInactive' => ($_GET['includeInactive'] ?? '') === 'true',
            ]);
            json_out(['products' => $products]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            if (empty($body['sku']) || empty($body['name'])) {
                json_out(['error' => 'SKU and product name are required'], 400);
            }
            $prod = mysql_save_product($pdo, $body);
            json_out(['product' => $prod], !empty($body['id']) ? 200 : 201);
        }
    }

    if ($route === 'customers') {
        if ($method === 'GET') {
            $branchId = parse_opt_int($_GET['branchId'] ?? null);
            json_out(['customers' => mysql_get_customers($pdo, $branchId)]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            if (empty($body['name'])) {
                json_out(['error' => 'Customer name is required'], 400);
            }
            $cust = mysql_create_customer($pdo, $body);
            json_out(['customer' => $cust], 201);
        }
    }

    if ($route === 'sales') {
        if ($method === 'GET') {
            $res = mysql_get_sales_register($pdo, [
                'branchId' => parse_opt_int($_GET['branchId'] ?? null),
                'fromDate' => $_GET['fromDate'] ?? null,
                'toDate' => $_GET['toDate'] ?? null,
                'fbrStatus' => $_GET['fbrStatus'] ?? 'ALL',
                'paymentMode' => $_GET['paymentMode'] ?? 'ALL',
                'invoiceType' => $_GET['invoiceType'] ?? 'ALL',
                'search' => $_GET['search'] ?? null,
                'limit' => (int)($_GET['limit'] ?? 100) ?: 100,
                'offset' => (int)($_GET['offset'] ?? 0) ?: 0,
            ]);
            json_out($res);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            $invoice = mysql_create_sale($pdo, $body);
            json_out(['invoice' => $invoice], 201);
        }
    }

    if (preg_match('#^invoices/(.+)$#', $route, $m)) {
        $identifier = urldecode($m[1]);
        if ($method === 'GET') {
            $invoice = mysql_get_invoice_detail($pdo, $identifier);
            if ($invoice === null) {
                json_out(['error' => 'Invoice not found'], 404);
            }
            json_out(['invoice' => $invoice]);
        }
        if ($method === 'POST') {
            $existing = mysql_get_invoice_detail($pdo, $identifier);
            if ($existing === null) {
                json_out(['error' => 'Invoice not found'], 404);
            }
            $updated = mysql_submit_invoice_to_fbr($pdo, (int)$existing['id'], false);
            json_out(['invoice' => $updated]);
        }
    }

    if ($route === 'fbr/sync' && $method === 'POST') {
        $body = read_json_body();
        $branchId = parse_opt_int($body['branchId'] ?? null);
        json_out(mysql_sync_pending_fbr_invoices($pdo, $branchId));
    }

    if ($route === 'returns') {
        if ($method === 'GET') {
            $res = mysql_get_sales_register($pdo, [
                'branchId' => parse_opt_int($_GET['branchId'] ?? null),
                'invoiceType' => 'RETURN',
                'limit' => 50,
            ]);
            json_out($res);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            $ret = mysql_create_sales_return($pdo, $body);
            json_out(['invoice' => $ret], 201);
        }
    }

    if ($route === 'hold') {
        if ($method === 'GET') {
            $branchId = parse_opt_int($_GET['branchId'] ?? null);
            json_out(['carts' => mysql_list_held_carts($pdo, $branchId)]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            if (($body['action'] ?? '') === 'delete') {
                $id = (int)($body['id'] ?? 0);
                if ($id <= 0) {
                    json_out(['error' => 'Valid held cart ID is required'], 400);
                }
                mysql_delete_held_cart($pdo, $id);
                json_out(['deleted' => true]);
            }
            $cart = mysql_hold_cart($pdo, $body);
            json_out(['cart' => $cart], 201);
        }
        if ($method === 'DELETE') {
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                json_out(['error' => 'Valid held cart ID is required'], 400);
            }
            mysql_delete_held_cart($pdo, $id);
            json_out(['deleted' => true]);
        }
    }

    if ($route === 'closing') {
        if ($method === 'GET') {
            $branchId = parse_opt_int($_GET['branchId'] ?? null);
            $date = !empty($_GET['date']) ? (string)$_GET['date'] : date('Y-m-d');
            $openingCash = (float)($_GET['openingCash'] ?? 0);
            $preview = $branchId ? mysql_get_day_closing_preview($pdo, $branchId, $date, $openingCash) : null;
            $history = mysql_list_day_closings($pdo, $branchId);
            json_out(['preview' => $preview, 'history' => $history]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            $closing = mysql_submit_day_closing($pdo, $body);
            json_out(['closing' => $closing], 201);
        }
    }

    if ($route === 'reports' && $method === 'GET') {
        $today = date('Y-m-d');
        $branchId = parse_opt_int($_GET['branchId'] ?? null);
        $fromDate = !empty($_GET['fromDate']) ? (string)$_GET['fromDate'] : $today;
        $toDate = !empty($_GET['toDate']) ? (string)$_GET['toDate'] : $today;
        json_out(mysql_get_reports_data($pdo, $branchId, $fromDate, $toDate));
    }

    if ($route === 'settings') {
        if ($method === 'GET') {
            $bt = mysql_get_branches_with_terminals($pdo);
            json_out([
                'settings' => mysql_get_business_settings($pdo),
                'branches' => $bt['branches'],
                'terminals' => $bt['terminals'],
                'users' => mysql_get_users($pdo),
            ]);
        }
        if ($method === 'POST') {
            $body = read_json_body();
            $action = (string)($body['action'] ?? '');
            $data = is_array($body['data'] ?? null) ? $body['data'] : [];
            if ($action === 'business') {
                json_out(['settings' => mysql_update_business_settings($pdo, $data)]);
            }
            if ($action === 'branch_terminal') {
                json_out(mysql_save_branch_and_terminal($pdo, $data));
            }
            if ($action === 'user') {
                json_out(['user' => mysql_create_user($pdo, $data)], 201);
            }
            json_out(['error' => 'Unknown settings action'], 400);
        }
    }

    json_out(['error' => "Route not found: {$route}"], 404);
} catch (Throwable $e) {
    json_out(['error' => $e->getMessage()], 400);
}
