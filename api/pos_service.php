<?php
declare(strict_types=1);

function cast_branch(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['is_active'] = (int)$r['is_active'];
    return $r;
}

function cast_terminal(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['branch_id'] = (int)$r['branch_id'];
    $r['next_sequence'] = (int)$r['next_sequence'];
    $r['is_active'] = (int)$r['is_active'];
    return $r;
}

function cast_user(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['branch_id'] = $r['branch_id'] !== null ? (int)$r['branch_id'] : null;
    $r['is_active'] = (int)$r['is_active'];
    unset($r['password_hash']);
    return $r;
}

function cast_product(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['sale_price'] = (float)$r['sale_price'];
    $r['cost_price'] = (float)$r['cost_price'];
    $r['tax_rate'] = (float)$r['tax_rate'];
    $r['stock_qty'] = (float)$r['stock_qty'];
    $r['is_active'] = (int)$r['is_active'];
    return $r;
}

function cast_customer(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['branch_id'] = $r['branch_id'] !== null ? (int)$r['branch_id'] : null;
    $r['is_walk_in'] = (int)$r['is_walk_in'];
    $r['city'] = (string)($r['city'] ?? '');
    $r['address'] = (string)($r['address'] ?? '');
    return $r;
}

function cast_invoice_item(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['invoice_id'] = (int)$r['invoice_id'];
    $r['product_id'] = (int)$r['product_id'];
    $r['quantity'] = (float)$r['quantity'];
    $r['unit_price'] = (float)$r['unit_price'];
    $r['discount_amount'] = (float)$r['discount_amount'];
    $r['tax_rate'] = (float)$r['tax_rate'];
    $r['tax_charged'] = (float)$r['tax_charged'];
    $r['line_total'] = (float)$r['line_total'];
    return $r;
}

function cast_invoice(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['original_invoice_id'] = $r['original_invoice_id'] !== null ? (int)$r['original_invoice_id'] : null;
    $r['branch_id'] = (int)$r['branch_id'];
    $r['terminal_id'] = (int)$r['terminal_id'];
    $r['customer_id'] = $r['customer_id'] !== null ? (int)$r['customer_id'] : null;
    $r['user_id'] = $r['user_id'] !== null ? (int)$r['user_id'] : null;
    $r['subtotal'] = (float)$r['subtotal'];
    $r['discount_total'] = (float)$r['discount_total'];
    $r['tax_total'] = (float)$r['tax_total'];
    $r['total_amount'] = (float)$r['total_amount'];
    $r['cash_amount'] = (float)$r['cash_amount'];
    $r['card_amount'] = (float)$r['card_amount'];
    $r['bank_amount'] = (float)$r['bank_amount'];
    $r['tendered_amount'] = (float)$r['tendered_amount'];
    $r['change_amount'] = (float)$r['change_amount'];
    return $r;
}

function cast_held_cart(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['branch_id'] = (int)$r['branch_id'];
    $r['customer_id'] = $r['customer_id'] !== null ? (int)$r['customer_id'] : null;
    $r['user_id'] = $r['user_id'] !== null ? (int)$r['user_id'] : null;
    $r['discount_total'] = (float)$r['discount_total'];
    $r['total_amount'] = (float)$r['total_amount'];
    $r['item_count'] = (int)$r['item_count'];
    return $r;
}

function cast_day_closing(array $r): array
{
    $r['id'] = (int)$r['id'];
    $r['branch_id'] = (int)$r['branch_id'];
    $r['user_id'] = $r['user_id'] !== null ? (int)$r['user_id'] : null;
    $r['opening_cash'] = (float)$r['opening_cash'];
    $r['gross_sales'] = (float)$r['gross_sales'];
    $r['returns_total'] = (float)$r['returns_total'];
    $r['net_sales'] = (float)$r['net_sales'];
    $r['cash_received'] = (float)$r['cash_received'];
    $r['card_received'] = (float)$r['card_received'];
    $r['bank_received'] = (float)$r['bank_received'];
    $r['expected_cash'] = (float)$r['expected_cash'];
    $r['counted_cash'] = (float)$r['counted_cash'];
    $r['variance'] = (float)$r['variance'];
    return $r;
}

function mysql_get_branches_with_terminals(PDO $pdo): array
{
    $branches = array_map(
        'cast_branch',
        $pdo->query('SELECT * FROM branches WHERE is_active = 1 ORDER BY id ASC')->fetchAll()
    );
    $terminals = array_map(
        'cast_terminal',
        $pdo->query('SELECT * FROM pos_terminals WHERE is_active = 1 ORDER BY branch_id ASC, id ASC')->fetchAll()
    );
    return ['branches' => $branches, 'terminals' => $terminals];
}

function mysql_get_business_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT setting_key, setting_value FROM business_settings')->fetchAll();
    $map = [];
    foreach ($rows as $r) {
        $map[$r['setting_key']] = $r['setting_value'];
    }
    return [
        'software_brand' => $map['software_brand'] ?? 'Softifyx',
        'business_name' => $map['business_name'] ?? 'M/S SEASTONE PVC PIPE INDUSTRY',
        'logo_data_url' => $map['logo_data_url'] ?? '',
        'footer_text' => $map['footer_text'] ?? 'Designed & Developed by Softifyx Technologies',
        'ntn' => $map['ntn'] ?? '',
        'strn' => $map['strn'] ?? '',
        'default_tax_rate' => (float)($map['default_tax_rate'] ?? 18),
        'default_opening_cash' => (float)($map['default_opening_cash'] ?? 5000),
        'receipt_footer' => $map['receipt_footer'] ?? '',
        'currency_symbol' => $map['currency_symbol'] ?? 'Rs.',
    ];
}

function mysql_update_business_settings(PDO $pdo, array $updates): array
{
    $allowed = [
        'software_brand',
        'business_name',
        'logo_data_url',
        'footer_text',
        'ntn',
        'strn',
        'default_tax_rate',
        'default_opening_cash',
        'receipt_footer',
        'currency_symbol',
    ];
    $sql = is_sqlite_pdo($pdo)
        ? 'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value'
        : 'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)';
    $stmt = $pdo->prepare($sql);
    $pdo->beginTransaction();
    try {
        foreach ($allowed as $k) {
            if (array_key_exists($k, $updates) && $updates[$k] !== null) {
                $stmt->execute([$k, (string)$updates[$k]]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    return mysql_get_business_settings($pdo);
}

function mysql_get_users(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT u.id, u.username, u.full_name, u.role, u.branch_id, b.display_name AS branch_name, u.is_active
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         ORDER BY u.id ASC'
    )->fetchAll();
    return array_map('cast_user', $rows);
}

function mysql_create_user(PDO $pdo, array $input): array
{
    $now = date('Y-m-d H:i:s');
    $hash = password_hash((string)$input['password'], PASSWORD_BCRYPT);
    $branchId = !empty($input['branch_id']) ? (int)$input['branch_id'] : null;

    $stmt = $pdo->prepare(
        'INSERT INTO users (username, full_name, password_hash, role, branch_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)'
    );
    $stmt->execute([
        trim((string)$input['username']),
        trim((string)$input['full_name']),
        $hash,
        (string)($input['role'] ?? 'CASHIER'),
        $branchId,
        $now,
    ]);
    $newId = (int)$pdo->lastInsertId();
    foreach (mysql_get_users($pdo) as $u) {
        if ($u['id'] === $newId) return $u;
    }
    throw new RuntimeException('Failed to load created user');
}

function mysql_update_user(PDO $pdo, array $input): array
{
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) {
        throw new RuntimeException('Valid user ID is required');
    }
    $fullName = trim((string)($input['full_name'] ?? ''));
    $role = (string)($input['role'] ?? 'CASHIER');
    $branchId = !empty($input['branch_id']) ? (int)$input['branch_id'] : null;
    $isActive = !empty($input['is_active']) ? 1 : 0;
    $password = trim((string)($input['password'] ?? ''));

    if ($password !== '') {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare(
            'UPDATE users SET full_name = ?, role = ?, branch_id = ?, is_active = ?, password_hash = ? WHERE id = ?'
        )->execute([$fullName, $role, $branchId, $isActive, $hash, $id]);
    } else {
        $pdo->prepare(
            'UPDATE users SET full_name = ?, role = ?, branch_id = ?, is_active = ? WHERE id = ?'
        )->execute([$fullName, $role, $branchId, $isActive, $id]);
    }

    foreach (mysql_get_users($pdo) as $u) {
        if ($u['id'] === $id) return $u;
    }
    throw new RuntimeException('User not found');
}

function mysql_export_system_backup(PDO $pdo): array
{
    $bt = mysql_get_branches_with_terminals($pdo);
    $reg = mysql_get_sales_register($pdo, ['limit' => 1000]);
    return [
        'exported_at' => date('Y-m-d H:i:s'),
        'settings' => mysql_get_business_settings($pdo),
        'branches' => $bt['branches'],
        'terminals' => $bt['terminals'],
        'users' => mysql_get_users($pdo),
        'products' => mysql_get_products($pdo, ['includeInactive' => true]),
        'customers' => mysql_get_customers($pdo),
        'invoices' => $reg['invoices'],
        'day_closings' => mysql_list_day_closings($pdo),
    ];
}

function mysql_clear_all_transactions(PDO $pdo): array
{
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM fbr_sync_logs');
        $pdo->exec('DELETE FROM invoice_items');
        $pdo->exec('DELETE FROM invoices WHERE original_invoice_id IS NOT NULL');
        $pdo->exec('DELETE FROM invoices');
        $pdo->exec('DELETE FROM held_carts');
        $pdo->exec('DELETE FROM day_closings');
        $pdo->exec('UPDATE pos_terminals SET next_sequence = 1');
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    return ['cleared' => true];
}

function mysql_authenticate_user(PDO $pdo, string $username, string $password): ?array
{
    $stmt = $pdo->prepare(
        'SELECT u.*, b.display_name AS branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE u.username = ? AND u.is_active = 1'
    );
    $stmt->execute([trim($username)]);
    $row = $stmt->fetch();
    if (!$row) return null;
    if (!password_verify($password, (string)$row['password_hash'])) return null;
    return cast_user($row);
}

function mysql_get_products(PDO $pdo, array $options = []): array
{
    $branchId = $options['branchId'] ?? null;
    $search = trim((string)($options['search'] ?? ''));
    $category = (string)($options['category'] ?? '');
    $includeInactive = !empty($options['includeInactive']);

    $where = [];
    $params = [];
    if (!$includeInactive) {
        $where[] = 'p.is_active = 1';
    }
    if ($category !== '' && $category !== 'ALL') {
        $where[] = 'p.category = ?';
        $params[] = $category;
    }
    if ($search !== '') {
        $q = "%{$search}%";
        $where[] = '(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.category LIKE ?)';
        array_push($params, $q, $q, $q, $q);
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    if ($branchId) {
        $sql = "SELECT p.id, p.sku, p.barcode, p.name, p.category, p.unit,
                       p.sale_price, p.cost_price, p.tax_rate, p.is_active,
                       COALESCE(bi.stock_qty, 0) AS stock_qty
                FROM products p
                LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = ?
                {$whereSql}
                ORDER BY p.category ASC, p.name ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge([(int)$branchId], $params));
        return array_map('cast_product', $stmt->fetchAll());
    }

    $sql = "SELECT p.id, p.sku, p.barcode, p.name, p.category, p.unit,
                   p.sale_price, p.cost_price, p.tax_rate, p.is_active,
                   COALESCE(SUM(bi.stock_qty), 0) AS stock_qty
            FROM products p
            LEFT JOIN branch_inventory bi ON bi.product_id = p.id
            {$whereSql}
            GROUP BY p.id
            ORDER BY p.category ASC, p.name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map('cast_product', $stmt->fetchAll());
}

function mysql_save_product(PDO $pdo, array $input): array
{
    $now = date('Y-m-d H:i:s');
    $pdo->beginTransaction();
    try {
        $productId = !empty($input['id']) ? (int)$input['id'] : null;
        if ($productId) {
            $stmt = $pdo->prepare(
                'UPDATE products
                 SET sku = ?, barcode = ?, name = ?, category = ?, unit = ?,
                     sale_price = ?, cost_price = ?, tax_rate = ?, is_active = ?
                 WHERE id = ?'
            );
            $stmt->execute([
                trim((string)$input['sku']),
                trim((string)($input['barcode'] ?? '')),
                trim((string)$input['name']),
                trim((string)($input['category'] ?? 'General')) ?: 'General',
                trim((string)($input['unit'] ?? 'Pcs')) ?: 'Pcs',
                round_money((float)$input['sale_price']),
                round_money((float)($input['cost_price'] ?? 0)),
                round_money((float)$input['tax_rate']),
                isset($input['is_active']) ? (int)$input['is_active'] : 1,
                $productId,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO products (sku, barcode, name, category, unit, sale_price, cost_price, tax_rate, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
            );
            $stmt->execute([
                trim((string)$input['sku']),
                trim((string)($input['barcode'] ?? '')),
                trim((string)$input['name']),
                trim((string)($input['category'] ?? 'General')) ?: 'General',
                trim((string)($input['unit'] ?? 'Pcs')) ?: 'Pcs',
                round_money((float)$input['sale_price']),
                round_money((float)($input['cost_price'] ?? 0)),
                round_money((float)$input['tax_rate']),
                $now,
            ]);
            $productId = (int)$pdo->lastInsertId();

            $branchIds = $pdo->query('SELECT id FROM branches')->fetchAll(PDO::FETCH_COLUMN);
            $invIgnoreSql = is_sqlite_pdo($pdo)
                ? 'INSERT OR IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)'
                : 'INSERT IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)';
            $invStmt = $pdo->prepare($invIgnoreSql);
            foreach ($branchIds as $bid) {
                $invStmt->execute([(int)$bid, $productId]);
            }
        }

        if (!empty($input['branch_id']) && array_key_exists('stock_qty', $input)) {
            $invSetSql = is_sqlite_pdo($pdo)
                ? 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
                   VALUES (?, ?, ?)
                   ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = excluded.stock_qty'
                : 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
                   VALUES (?, ?, ?)
                   ON DUPLICATE KEY UPDATE stock_qty = VALUES(stock_qty)';
            $pdo->prepare($invSetSql)->execute([(int)$input['branch_id'], $productId, (float)$input['stock_qty']]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    $products = mysql_get_products($pdo, [
        'branchId' => !empty($input['branch_id']) ? (int)$input['branch_id'] : null,
        'includeInactive' => true,
    ]);
    foreach ($products as $p) {
        if ($p['id'] === $productId) return $p;
    }
    throw new RuntimeException('Failed to load saved product');
}

function mysql_delete_product(PDO $pdo, int $id): bool
{
    $hasSales = $pdo->prepare('SELECT id FROM invoice_items WHERE product_id = ? LIMIT 1');
    $hasSales->execute([$id]);
    if ($hasSales->fetch()) {
        $upd = $pdo->prepare('UPDATE products SET is_active = 0 WHERE id = ?');
        $upd->execute([$id]);
        return true;
    }
    $delInv = $pdo->prepare('DELETE FROM branch_inventory WHERE product_id = ?');
    $delInv->execute([$id]);
    $del = $pdo->prepare('DELETE FROM products WHERE id = ?');
    $del->execute([$id]);
    return true;
}

function mysql_get_customers(PDO $pdo, ?int $branchId = null): array
{
    if ($branchId) {
        $stmt = $pdo->prepare(
            'SELECT id, branch_id, name, phone, cnic, ntn, is_walk_in
             FROM customers
             WHERE branch_id IS NULL OR branch_id = ?
             ORDER BY is_walk_in DESC, name ASC'
        );
        $stmt->execute([$branchId]);
        return array_map('cast_customer', $stmt->fetchAll());
    }
    $rows = $pdo->query(
        'SELECT id, branch_id, name, phone, cnic, ntn, is_walk_in
         FROM customers
         ORDER BY is_walk_in DESC, name ASC'
    )->fetchAll();
    return array_map('cast_customer', $rows);
}

function mysql_create_customer(PDO $pdo, array $input): array
{
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)'
    );
    $stmt->execute([
        !empty($input['branch_id']) ? (int)$input['branch_id'] : null,
        trim((string)$input['name']),
        trim((string)($input['phone'] ?? '')),
        trim((string)($input['cnic'] ?? '')),
        trim((string)($input['ntn'] ?? '')),
        $now,
    ]);
    $id = (int)$pdo->lastInsertId();
    $row = $pdo->prepare('SELECT id, branch_id, name, phone, cnic, ntn, is_walk_in FROM customers WHERE id = ?');
    $row->execute([$id]);
    return cast_customer($row->fetch());
}

function mysql_update_customer(PDO $pdo, int $id, array $input): array
{
    $stmt = $pdo->prepare(
        'UPDATE customers
         SET branch_id = ?, name = ?, phone = ?, cnic = ?, ntn = ?
         WHERE id = ?'
    );
    $stmt->execute([
        !empty($input['branch_id']) ? (int)$input['branch_id'] : null,
        trim((string)$input['name']),
        trim((string)($input['phone'] ?? '')),
        trim((string)($input['cnic'] ?? '')),
        trim((string)($input['ntn'] ?? '')),
        $id,
    ]);
    $row = $pdo->prepare('SELECT id, branch_id, name, phone, cnic, ntn, is_walk_in FROM customers WHERE id = ?');
    $row->execute([$id]);
    return cast_customer($row->fetch());
}

function mysql_delete_customer(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare('SELECT is_walk_in FROM customers WHERE id = ?');
    $stmt->execute([$id]);
    $cust = $stmt->fetch();
    if (!$cust || (int)$cust['is_walk_in'] === 1) {
        return false;
    }
    $del = $pdo->prepare('DELETE FROM customers WHERE id = ?');
    $del->execute([$id]);
    return true;
}

function mysql_get_dashboard_summary(PDO $pdo, ?int $branchId, string $fromDate, string $toDate, int $limit = 15): array
{
    $where = ['i.invoice_date >= ?', 'i.invoice_date <= ?'];
    $params = [$fromDate, $toDate];
    if ($branchId) {
        $where[] = 'i.branch_id = ?';
        $params[] = $branchId;
    }
    $whereSql = implode(' AND ', $where);

    $aggStmt = $pdo->prepare(
        "SELECT
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS total_sale,
           COUNT(CASE WHEN i.invoice_type = 'SALE' THEN 1 END) AS total_invoices,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.cash_amount ELSE -i.cash_amount END), 0) AS cash_received,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.card_amount ELSE -i.card_amount END), 0) AS card_received,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.bank_amount ELSE -i.bank_amount END), 0) AS bank_received,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE -i.tax_total END), 0) AS tax_collected,
           COUNT(CASE WHEN i.fbr_status = 'SUBMITTED' THEN 1 END) AS fbr_submitted,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.total_amount ELSE 0 END), 0) AS total_returns
         FROM invoices i
         WHERE {$whereSql}"
    );
    $aggStmt->execute($params);
    $agg = $aggStmt->fetch();

    if ($branchId) {
        $pendStmt = $pdo->prepare("SELECT COUNT(*) FROM invoices WHERE branch_id = ? AND fbr_status IN ('PENDING', 'FAILED')");
        $pendStmt->execute([$branchId]);
    } else {
        $pendStmt = $pdo->query("SELECT COUNT(*) FROM invoices WHERE fbr_status IN ('PENDING', 'FAILED')");
    }
    $pendingCount = (int)$pendStmt->fetchColumn();

    $bFilter = $branchId ? 'AND b.id = ?' : '';
    $bParams = $branchId ? [$fromDate, $toDate, $fromDate, $toDate, $branchId] : [$fromDate, $toDate, $fromDate, $toDate];
    $bStmt = $pdo->prepare(
        "SELECT
           b.id AS branch_id,
           b.name AS branch_name,
           b.display_name,
           COALESCE(SUM(CASE WHEN i.invoice_date >= ? AND i.invoice_date <= ?
             THEN (CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END)
             ELSE 0 END), 0) AS total_sale,
           COUNT(CASE WHEN i.invoice_date >= ? AND i.invoice_date <= ? AND i.invoice_type = 'SALE' THEN 1 END) AS invoice_count,
           COUNT(CASE WHEN i.fbr_status IN ('PENDING', 'FAILED') THEN 1 END) AS fbr_pending
         FROM branches b
         LEFT JOIN invoices i ON i.branch_id = b.id
         WHERE b.is_active = 1 {$bFilter}
         GROUP BY b.id, b.name, b.display_name
         ORDER BY total_sale DESC, b.id ASC"
    );
    $bStmt->execute($bParams);
    $branchBreakdown = array_map(function (array $r): array {
        return [
            'branch_id' => (int)$r['branch_id'],
            'branch_name' => (string)$r['branch_name'],
            'display_name' => (string)$r['display_name'],
            'total_sale' => round_money((float)$r['total_sale']),
            'invoice_count' => (int)$r['invoice_count'],
            'fbr_pending' => (int)$r['fbr_pending'],
        ];
    }, $bStmt->fetchAll());

    $trendStmt = $pdo->prepare(
        "SELECT i.invoice_date, i.created_at, i.invoice_type, i.total_amount
         FROM invoices i
         WHERE {$whereSql}
         ORDER BY i.created_at ASC"
    );
    $trendStmt->execute($params);
    $singleDay = ($fromDate === $toDate);
    $trendMap = [];
    foreach ($trendStmt->fetchAll() as $row) {
        $label = $singleDay ? (substr((string)$row['created_at'], 11, 2) ?: '00') . ':00' : (string)$row['invoice_date'];
        if (!isset($trendMap[$label])) {
            $trendMap[$label] = ['label' => $label, 'sale_amount' => 0.0, 'invoice_count' => 0];
        }
        $delta = $row['invoice_type'] === 'SALE' ? (float)$row['total_amount'] : -(float)$row['total_amount'];
        $trendMap[$label]['sale_amount'] = round_money($trendMap[$label]['sale_amount'] + $delta);
        if ($row['invoice_type'] === 'SALE') {
            $trendMap[$label]['invoice_count'] += 1;
        }
    }
    $salesTrend = array_values($trendMap);

    if ($branchId) {
        $lowStmt = $pdo->prepare(
            'SELECT p.id AS product_id, p.sku, p.name, p.unit, COALESCE(bi.stock_qty, 0) AS stock_qty
             FROM products p
             LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = ?
             WHERE p.is_active = 1
             ORDER BY stock_qty ASC, p.name ASC
             LIMIT 5'
        );
        $lowStmt->execute([$branchId]);
    } else {
        $lowStmt = $pdo->query(
            'SELECT p.id AS product_id, p.sku, p.name, p.unit, COALESCE(SUM(bi.stock_qty), 0) AS stock_qty
             FROM products p
             LEFT JOIN branch_inventory bi ON bi.product_id = p.id
             WHERE p.is_active = 1
             GROUP BY p.id, p.sku, p.name, p.unit
             ORDER BY stock_qty ASC, p.name ASC
             LIMIT 5'
        );
    }
    $lowStockItems = array_map(function (array $r): array {
        return [
            'product_id' => (int)$r['product_id'],
            'sku' => (string)$r['sku'],
            'name' => (string)$r['name'],
            'unit' => (string)$r['unit'],
            'stock_qty' => (float)$r['stock_qty'],
        ];
    }, $lowStmt->fetchAll());

    $safeLimit = max(1, (int)$limit);
    $recStmt = $pdo->prepare(
        "SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
                orig.invoice_no AS original_invoice_no
         FROM invoices i
         JOIN branches b ON b.id = i.branch_id
         LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
         WHERE {$whereSql}
         ORDER BY i.created_at DESC, i.id DESC
         LIMIT {$safeLimit}"
    );
    $recStmt->execute($params);
    $recent = array_map('cast_invoice', $recStmt->fetchAll());

    $totalSale = round_money((float)$agg['total_sale']);
    $totalInv = (int)$agg['total_invoices'];
    $avgTicket = $totalInv > 0 ? round_money($totalSale / $totalInv) : 0.0;

    $settings = mysql_get_business_settings($pdo);
    $openingCash = 0.0;
    $prevStmt = $pdo->prepare(
        'SELECT counted_cash FROM day_closings WHERE branch_id = ? AND closing_date < ? ORDER BY closing_date DESC LIMIT 1'
    );
    if ($branchId) {
        $prevStmt->execute([$branchId, $fromDate]);
        $prevRow = $prevStmt->fetch();
        $openingCash = $prevRow ? round_money((float)$prevRow['counted_cash']) : round_money((float)$settings['default_opening_cash']);
    } else {
        foreach ($branchBreakdown as $br) {
            $prevStmt->execute([(int)$br['branch_id'], $fromDate]);
            $prevRow = $prevStmt->fetch();
            $openingCash = round_money($openingCash + ($prevRow ? (float)$prevRow['counted_cash'] : (float)$settings['default_opening_cash']));
        }
    }

    if ($branchId) {
        $hStmt = $pdo->prepare('SELECT COUNT(*) FROM held_carts WHERE branch_id = ?');
        $hStmt->execute([$branchId]);
    } else {
        $hStmt = $pdo->query('SELECT COUNT(*) FROM held_carts');
    }
    $heldCount = (int)$hStmt->fetchColumn();

    return [
        'total_sale' => $totalSale,
        'total_invoices' => $totalInv,
        'cash_received' => round_money((float)$agg['cash_received']),
        'card_received' => round_money((float)$agg['card_received']),
        'bank_received' => round_money((float)$agg['bank_received']),
        'tax_collected' => round_money((float)$agg['tax_collected']),
        'avg_ticket' => $avgTicket,
        'fbr_pending' => $pendingCount,
        'fbr_submitted' => (int)$agg['fbr_submitted'],
        'total_returns' => round_money((float)$agg['total_returns']),
        'opening_cash' => $openingCash,
        'held_carts_count' => $heldCount,
        'branch_breakdown' => $branchBreakdown,
        'sales_trend' => $salesTrend,
        'low_stock_items' => $lowStockItems,
        'recent_invoices' => $recent,
    ];
}

function mysql_get_sales_register(PDO $pdo, array $filters): array
{
    $where = ['1=1'];
    $params = [];

    if (!empty($filters['branchId'])) {
        $where[] = 'i.branch_id = ?';
        $params[] = (int)$filters['branchId'];
    }
    if (!empty($filters['fromDate'])) {
        $where[] = 'i.invoice_date >= ?';
        $params[] = (string)$filters['fromDate'];
    }
    if (!empty($filters['toDate'])) {
        $where[] = 'i.invoice_date <= ?';
        $params[] = (string)$filters['toDate'];
    }
    if (!empty($filters['fbrStatus']) && $filters['fbrStatus'] !== 'ALL') {
        $where[] = 'i.fbr_status = ?';
        $params[] = (string)$filters['fbrStatus'];
    }
    if (!empty($filters['paymentMode']) && $filters['paymentMode'] !== 'ALL') {
        $where[] = 'i.payment_mode = ?';
        $params[] = (string)$filters['paymentMode'];
    }
    if (!empty($filters['invoiceType']) && $filters['invoiceType'] !== 'ALL') {
        $where[] = 'i.invoice_type = ?';
        $params[] = (string)$filters['invoiceType'];
    }
    if (!empty($filters['search']) && trim((string)$filters['search']) !== '') {
        $q = '%' . trim((string)$filters['search']) . '%';
        $where[] = '(i.invoice_no LIKE ? OR i.fbr_invoice_no LIKE ? OR i.customer_name LIKE ? OR i.usin LIKE ?)';
        array_push($params, $q, $q, $q, $q);
    }

    $whereSql = implode(' AND ', $where);
    $sumStmt = $pdo->prepare(
        "SELECT
           COUNT(*) AS total_count,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS net_sale,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.cash_amount ELSE -i.cash_amount END), 0) AS cash_received,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.card_amount ELSE -i.card_amount END), 0) AS card_received,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.bank_amount ELSE -i.bank_amount END), 0) AS bank_received,
           COALESCE(SUM(CASE WHEN i.fbr_status IN ('PENDING', 'FAILED') THEN 1 ELSE 0 END), 0) AS pending_count
         FROM invoices i
         WHERE {$whereSql}"
    );
    $sumStmt->execute($params);
    $sum = $sumStmt->fetch();

    $limit = max(1, (int)($filters['limit'] ?? 100));
    $offset = max(0, (int)($filters['offset'] ?? 0));

    $listStmt = $pdo->prepare(
        "SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
                orig.invoice_no AS original_invoice_no
         FROM invoices i
         JOIN branches b ON b.id = i.branch_id
         LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
         WHERE {$whereSql}
         ORDER BY i.created_at DESC, i.id DESC
         LIMIT {$limit} OFFSET {$offset}"
    );
    $listStmt->execute($params);
    $invoices = array_map('cast_invoice', $listStmt->fetchAll());

    return [
        'invoices' => $invoices,
        'totalCount' => (int)$sum['total_count'],
        'totals' => [
            'netSale' => round_money((float)$sum['net_sale']),
            'cashReceived' => round_money((float)$sum['cash_received']),
            'cardReceived' => round_money((float)$sum['card_received']),
            'bankReceived' => round_money((float)$sum['bank_received']),
            'pendingCount' => (int)$sum['pending_count'],
        ],
    ];
}

function mysql_get_invoice_detail(PDO $pdo, $identifier): ?array
{
    $byId = is_int($identifier) || preg_match('/^\d+$/', (string)$identifier);
    $sql = 'SELECT i.*, b.name AS branch_name, b.display_name AS branch_display_name,
                   orig.invoice_no AS original_invoice_no
            FROM invoices i
            JOIN branches b ON b.id = i.branch_id
            LEFT JOIN invoices orig ON orig.id = i.original_invoice_id
            WHERE ' . ($byId ? 'i.id = ?' : 'i.invoice_no = ?');
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$byId ? (int)$identifier : trim((string)$identifier)]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $invoice = cast_invoice($row);

    $itemsStmt = $pdo->prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC');
    $itemsStmt->execute([$invoice['id']]);
    $items = array_map('cast_invoice_item', $itemsStmt->fetchAll());

    $retStmt = $pdo->prepare(
        "SELECT ii.product_id, SUM(ii.quantity) AS returned_qty
         FROM invoice_items ii
         JOIN invoices ret ON ret.id = ii.invoice_id
         WHERE ret.original_invoice_id = ? AND ret.invoice_type = 'RETURN'
         GROUP BY ii.product_id"
    );
    $retStmt->execute([$invoice['id']]);
    $returned = [];
    foreach ($retStmt->fetchAll() as $r) {
        $returned[(string)(int)$r['product_id']] = (float)$r['returned_qty'];
    }

    $invoice['items'] = $items;
    $invoice['returned_quantities'] = (object)$returned;
    $invoice['fbr_qr_payload'] = build_fbr_qr_payload($invoice);
    return $invoice;
}

function mysql_submit_invoice_to_fbr(PDO $pdo, int $invoiceId, bool $simulateOffline = false): array
{
    $detail = mysql_get_invoice_detail($pdo, $invoiceId);
    if (!$detail) {
        throw new RuntimeException("Invoice {$invoiceId} not found");
    }

    $termStmt = $pdo->prepare('SELECT * FROM pos_terminals WHERE id = ?');
    $termStmt->execute([$detail['terminal_id']]);
    $terminal = $termStmt->fetch();
    if (!$terminal) {
        throw new RuntimeException('POS Terminal not found');
    }

    $customer = null;
    if ($detail['customer_id']) {
        $cStmt = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
        $cStmt->execute([$detail['customer_id']]);
        $customer = $cStmt->fetch() ?: null;
    }

    $refUsin = null;
    if ($detail['original_invoice_id']) {
        $oStmt = $pdo->prepare('SELECT usin FROM invoices WHERE id = ?');
        $oStmt->execute([$detail['original_invoice_id']]);
        $refUsin = $oStmt->fetchColumn() ?: null;
    }

    $payload = build_fbr_invoice_payload(
        $detail,
        $detail['items'],
        (string)$terminal['fbr_pos_id'],
        (string)($customer['phone'] ?? ''),
        (string)($customer['cnic'] ?? ''),
        (string)($customer['ntn'] ?? ''),
        $refUsin ? (string)$refUsin : null
    );

    $res = dispatch_to_fbr((string)$terminal['fbr_mode'], (string)$terminal['fbr_token'], $payload, $simulateOffline);
    $now = date('Y-m-d H:i:s');

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO fbr_sync_logs (
               invoice_id, invoice_no, usin, fbr_pos_id, mode, http_status, success,
               fbr_invoice_no, error_message, request_payload, response_payload, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $detail['id'],
            $detail['invoice_no'],
            $detail['usin'],
            (string)$terminal['fbr_pos_id'],
            (string)$terminal['fbr_mode'],
            $res['httpStatus'],
            $res['success'] ? 1 : 0,
            $res['fbrInvoiceNo'],
            $res['errorMessage'],
            json_encode($res['requestPayload']),
            (string)$res['responsePayload'],
            $now,
        ]);

        if ($res['success']) {
            $pdo->prepare(
                "UPDATE invoices
                 SET fbr_status = 'SUBMITTED', fbr_invoice_no = ?, fbr_pos_id = ?, fbr_error = NULL, fbr_submitted_at = ?
                 WHERE id = ?"
            )->execute([$res['fbrInvoiceNo'], (string)$terminal['fbr_pos_id'], $now, $detail['id']]);
        } else {
            $nextStatus = ($res['httpStatus'] === null || $res['httpStatus'] >= 500) ? 'PENDING' : 'FAILED';
            $pdo->prepare(
                'UPDATE invoices SET fbr_status = ?, fbr_pos_id = ?, fbr_error = ? WHERE id = ?'
            )->execute([$nextStatus, (string)$terminal['fbr_pos_id'], $res['errorMessage'], $detail['id']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    return mysql_get_invoice_detail($pdo, $invoiceId);
}

function mysql_sync_pending_fbr_invoices(PDO $pdo, ?int $branchId = null): array
{
    if ($branchId) {
        $stmt = $pdo->prepare("SELECT id FROM invoices WHERE branch_id = ? AND fbr_status IN ('PENDING', 'FAILED') ORDER BY id ASC");
        $stmt->execute([$branchId]);
    } else {
        $stmt = $pdo->query("SELECT id FROM invoices WHERE fbr_status IN ('PENDING', 'FAILED') ORDER BY id ASC");
    }
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $succeeded = 0;
    $failed = 0;
    foreach ($ids as $id) {
        $updated = mysql_submit_invoice_to_fbr($pdo, (int)$id, false);
        if ($updated['fbr_status'] === 'SUBMITTED') {
            $succeeded++;
        } else {
            $failed++;
        }
    }

    return ['attempted' => count($ids), 'succeeded' => $succeeded, 'failed' => $failed];
}

function mysql_create_sale(PDO $pdo, array $input): array
{
    if (empty($input['items']) || !is_array($input['items'])) {
        throw new RuntimeException('At least one item is required to create a sale');
    }

    $branchId = (int)($input['branchId'] ?? 0);
    $invoiceDate = date('Y-m-d');
    $createdAt = date('Y-m-d H:i:s');

    $isSqlite = is_sqlite_pdo($pdo);
    $forUpdate = $isSqlite ? '' : ' FOR UPDATE';
    $pdo->beginTransaction();
    try {
        if (!empty($input['terminalId'])) {
            $tStmt = $pdo->prepare("SELECT * FROM pos_terminals WHERE id = ? AND branch_id = ? AND is_active = 1{$forUpdate}");
            $tStmt->execute([(int)$input['terminalId'], $branchId]);
        } else {
            $tStmt = $pdo->prepare("SELECT * FROM pos_terminals WHERE branch_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1{$forUpdate}");
            $tStmt->execute([$branchId]);
        }
        $terminal = $tStmt->fetch();
        if (!$terminal) {
            throw new RuntimeException('Active POS terminal not found for selected branch');
        }

        $bStmt = $pdo->prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1');
        $bStmt->execute([$branchId]);
        $branch = $bStmt->fetch();
        if (!$branch) {
            throw new RuntimeException('Selected branch not found');
        }

        $customerId = !empty($input['customerId']) ? (int)$input['customerId'] : null;
        $customerName = trim((string)($input['customerName'] ?? ''));
        if ($customerId) {
            $cStmt = $pdo->prepare('SELECT id, name FROM customers WHERE id = ?');
            $cStmt->execute([$customerId]);
            $cust = $cStmt->fetch();
            if ($cust) {
                $customerName = (string)$cust['name'];
            }
        } else {
            $wStmt = $pdo->prepare('SELECT id, name FROM customers WHERE branch_id = ? AND is_walk_in = 1 LIMIT 1');
            $wStmt->execute([$branchId]);
            $walkIn = $wStmt->fetch();
            if ($walkIn) {
                $customerId = (int)$walkIn['id'];
                if ($customerName === '') $customerName = (string)$walkIn['name'];
            }
        }
        if ($customerName === '') {
            $customerName = "Walk-in (Cash) Customer ( {$branch['name']} )";
        }

        $seq = (int)$terminal['next_sequence'];
        $pdo->prepare('UPDATE pos_terminals SET next_sequence = next_sequence + 1 WHERE id = ?')->execute([(int)$terminal['id']]);

        $invoiceNo = "{$terminal['invoice_prefix']}-{$seq}";
        $usin = "{$terminal['invoice_prefix']}-" . str_replace('-', '', $invoiceDate) . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);

        $prodStmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
        $computedItems = [];
        $subtotal = 0.0;
        $itemDiscountSum = 0.0;
        $taxTotal = 0.0;

        foreach ($input['items'] as $reqItem) {
            $qty = (float)($reqItem['quantity'] ?? 0);
            if ($qty <= 0) {
                throw new RuntimeException('Item quantity must be greater than zero');
            }
            $prodStmt->execute([(int)$reqItem['productId']]);
            $product = $prodStmt->fetch();
            if (!$product) {
                throw new RuntimeException("Product {$reqItem['productId']} not found");
            }

            $unitPrice = round_money(isset($reqItem['unitPrice']) ? (float)$reqItem['unitPrice'] : (float)$product['sale_price']);
            $gross = round_money($unitPrice * $qty);
            $discountAmt = round_money(max(0.0, min($gross, (float)($reqItem['discountAmount'] ?? 0))));
            $netSale = round_money($gross - $discountAmt);
            $taxRate = (float)$product['tax_rate'];
            $taxCharged = round_money(($netSale * $taxRate) / 100);
            $lineTotal = round_money($netSale + $taxCharged);

            $subtotal = round_money($subtotal + $gross);
            $itemDiscountSum = round_money($itemDiscountSum + $discountAmt);
            $taxTotal = round_money($taxTotal + $taxCharged);

            $computedItems[] = [
                'productId' => (int)$product['id'],
                'sku' => (string)$product['sku'],
                'name' => (string)$product['name'],
                'quantity' => $qty,
                'unitPrice' => $unitPrice,
                'discountAmount' => $discountAmt,
                'taxRate' => $taxRate,
                'taxCharged' => $taxCharged,
                'lineTotal' => $lineTotal,
            ];
        }

        $extraDiscount = round_money(max(0.0, (float)($input['invoiceDiscount'] ?? 0)));
        $discountTotal = round_money($itemDiscountSum + $extraDiscount);
        $totalAmount = round_money(max(0.0, $subtotal - $discountTotal + $taxTotal));

        $paymentMode = (string)($input['paymentMode'] ?? 'CASH');
        $cashAmount = 0.0;
        $cardAmount = 0.0;
        $bankAmount = 0.0;
        $tenderedAmount = round_money((float)($input['tenderedAmount'] ?? $totalAmount));
        $changeAmount = 0.0;

        if ($paymentMode === 'CASH') {
            $cashAmount = $totalAmount;
            if ($tenderedAmount < $totalAmount) $tenderedAmount = $totalAmount;
            $changeAmount = round_money(max(0.0, $tenderedAmount - $totalAmount));
        } elseif ($paymentMode === 'CARD') {
            $cardAmount = $totalAmount;
            $tenderedAmount = $totalAmount;
        } elseif ($paymentMode === 'BANK') {
            $bankAmount = $totalAmount;
            $tenderedAmount = $totalAmount;
        } else {
            $cashAmount = round_money(max(0.0, (float)($input['cashAmount'] ?? 0)));
            $cardAmount = round_money(max(0.0, (float)($input['cardAmount'] ?? 0)));
            $bankAmount = round_money(max(0.0, (float)($input['bankAmount'] ?? 0)));
            $paid = round_money($cashAmount + $cardAmount + $bankAmount);
            if ($paid < $totalAmount) {
                $cashAmount = round_money($cashAmount + ($totalAmount - $paid));
            }
            $tenderedAmount = round_money($cashAmount + $cardAmount + $bankAmount);
        }

        $pdo->prepare(
            "INSERT INTO invoices (
               invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
               customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
               subtotal, discount_total, tax_total, total_amount, payment_mode,
               cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
               fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
             ) VALUES (?, ?, 'SALE', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, ?, NULL, NULL, ?)"
        )->execute([
            $invoiceNo,
            $usin,
            $branchId,
            (int)$terminal['id'],
            $customerId,
            $customerName,
            !empty($input['userId']) ? (int)$input['userId'] : null,
            trim((string)($input['cashierName'] ?? 'POS Cashier')) ?: 'POS Cashier',
            $invoiceDate,
            $createdAt,
            $subtotal,
            $discountTotal,
            $taxTotal,
            $totalAmount,
            $paymentMode,
            $cashAmount,
            $cardAmount,
            $bankAmount,
            $tenderedAmount,
            $changeAmount,
            (string)$terminal['fbr_pos_id'],
            trim((string)($input['notes'] ?? '')),
        ]);

        $newInvoiceId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            'INSERT INTO invoice_items (
               invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount,
               tax_rate, tax_charged, line_total
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $invUpdateSql = $isSqlite
            ? 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
               VALUES (?, ?, ?)
               ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = branch_inventory.stock_qty + excluded.stock_qty'
            : 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE stock_qty = stock_qty + VALUES(stock_qty)';
        $invUpdateStmt = $pdo->prepare($invUpdateSql);

        foreach ($computedItems as $ci) {
            $itemStmt->execute([
                $newInvoiceId,
                $ci['productId'],
                $ci['sku'],
                $ci['name'],
                $ci['quantity'],
                $ci['unitPrice'],
                $ci['discountAmount'],
                $ci['taxRate'],
                $ci['taxCharged'],
                $ci['lineTotal'],
            ]);
            $invUpdateStmt->execute([$branchId, $ci['productId'], -$ci['quantity']]);
        }

        if (!empty($input['heldCartId'])) {
            $pdo->prepare('DELETE FROM held_carts WHERE id = ?')->execute([(int)$input['heldCartId']]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    return mysql_submit_invoice_to_fbr($pdo, $newInvoiceId, !empty($input['simulateFbrOffline']));
}

function mysql_create_sales_return(PDO $pdo, array $input): array
{
    if (empty($input['items']) || !is_array($input['items'])) {
        throw new RuntimeException('Select at least one item to return');
    }

    $orig = mysql_get_invoice_detail($pdo, (int)($input['originalInvoiceId'] ?? 0));
    if (!$orig) {
        throw new RuntimeException('Original invoice not found');
    }
    if ($orig['invoice_type'] !== 'SALE') {
        throw new RuntimeException('Returns can only be processed against a SALE invoice');
    }

    $invoiceDate = date('Y-m-d');
    $createdAt = date('Y-m-d H:i:s');

    $isSqlite = is_sqlite_pdo($pdo);
    $forUpdate = $isSqlite ? '' : ' FOR UPDATE';
    $pdo->beginTransaction();
    try {
        $tStmt = $pdo->prepare("SELECT * FROM pos_terminals WHERE id = ?{$forUpdate}");
        $tStmt->execute([$orig['terminal_id']]);
        $terminal = $tStmt->fetch();
        if (!$terminal) {
            throw new RuntimeException('POS terminal not found');
        }

        $seq = (int)$terminal['next_sequence'];
        $pdo->prepare('UPDATE pos_terminals SET next_sequence = next_sequence + 1 WHERE id = ?')->execute([(int)$terminal['id']]);

        $invoiceNo = "{$terminal['invoice_prefix']}-{$seq}-RET";
        $usin = "{$terminal['invoice_prefix']}-" . str_replace('-', '', $invoiceDate) . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT) . '-R';

        $origItemsByProd = [];
        foreach ($orig['items'] as $oi) {
            $origItemsByProd[(int)$oi['product_id']] = $oi;
        }
        $returnedMap = (array)$orig['returned_quantities'];

        $subtotal = 0.0;
        $discountTotal = 0.0;
        $taxTotal = 0.0;
        $totalAmount = 0.0;
        $lineRecords = [];

        foreach ($input['items'] as $reqItem) {
            $pid = (int)$reqItem['productId'];
            $qty = (float)($reqItem['quantity'] ?? 0);
            if ($qty <= 0) {
                throw new RuntimeException('Return quantity must be greater than zero');
            }
            if (!isset($origItemsByProd[$pid])) {
                throw new RuntimeException("Product {$pid} is not part of original invoice");
            }
            $origItem = $origItemsByProd[$pid];
            $alreadyReturned = (float)($returnedMap[(string)$pid] ?? 0);
            $maxReturnable = round_money((float)$origItem['quantity'] - $alreadyReturned);
            if ($qty > $maxReturnable) {
                throw new RuntimeException(
                    "Cannot return {$qty} of \"{$origItem['item_name']}\". Remaining returnable qty: {$maxReturnable}"
                );
            }

            $ratio = $qty / (float)$origItem['quantity'];
            $lineGross = round_money((float)$origItem['unit_price'] * $qty);
            $lineDiscount = round_money((float)$origItem['discount_amount'] * $ratio);
            $lineTax = round_money((float)$origItem['tax_charged'] * $ratio);
            $lineTotal = round_money($lineGross - $lineDiscount + $lineTax);

            $subtotal = round_money($subtotal + $lineGross);
            $discountTotal = round_money($discountTotal + $lineDiscount);
            $taxTotal = round_money($taxTotal + $lineTax);
            $totalAmount = round_money($totalAmount + $lineTotal);

            $lineRecords[] = [
                'productId' => $pid,
                'sku' => (string)$origItem['sku'],
                'itemName' => (string)$origItem['item_name'],
                'quantity' => $qty,
                'unitPrice' => (float)$origItem['unit_price'],
                'discountAmount' => $lineDiscount,
                'taxRate' => (float)$origItem['tax_rate'],
                'taxCharged' => $lineTax,
                'lineTotal' => $lineTotal,
            ];
        }

        $refundMode = (string)($input['refundMode'] ?? 'CASH');
        $cashAmount = $refundMode === 'CASH' ? $totalAmount : 0.0;
        $cardAmount = $refundMode === 'CARD' ? $totalAmount : 0.0;
        $bankAmount = $refundMode === 'BANK' ? $totalAmount : 0.0;

        $pdo->prepare(
            "INSERT INTO invoices (
               invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
               customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
               subtotal, discount_total, tax_total, total_amount, payment_mode,
               cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
               fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
             ) VALUES (?, ?, 'RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', NULL, ?, NULL, NULL, ?)"
        )->execute([
            $invoiceNo,
            $usin,
            $orig['id'],
            $orig['branch_id'],
            (int)$terminal['id'],
            $orig['customer_id'],
            $orig['customer_name'],
            !empty($input['userId']) ? (int)$input['userId'] : null,
            trim((string)($input['cashierName'] ?? 'POS Cashier')) ?: 'POS Cashier',
            $invoiceDate,
            $createdAt,
            $subtotal,
            $discountTotal,
            $taxTotal,
            $totalAmount,
            $refundMode,
            $cashAmount,
            $cardAmount,
            $bankAmount,
            $totalAmount,
            (string)$terminal['fbr_pos_id'],
            trim((string)($input['reason'] ?? 'Customer Return')),
        ]);

        $newReturnId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            'INSERT INTO invoice_items (
               invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount,
               tax_rate, tax_charged, line_total
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $invRestoreSql = $isSqlite
            ? 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
               VALUES (?, ?, ?)
               ON CONFLICT(branch_id, product_id) DO UPDATE SET stock_qty = branch_inventory.stock_qty + excluded.stock_qty'
            : 'INSERT INTO branch_inventory (branch_id, product_id, stock_qty)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE stock_qty = stock_qty + VALUES(stock_qty)';
        $invRestoreStmt = $pdo->prepare($invRestoreSql);

        foreach ($lineRecords as $line) {
            $itemStmt->execute([
                $newReturnId,
                $line['productId'],
                $line['sku'],
                $line['itemName'],
                $line['quantity'],
                $line['unitPrice'],
                $line['discountAmount'],
                $line['taxRate'],
                $line['taxCharged'],
                $line['lineTotal'],
            ]);
            $invRestoreStmt->execute([$orig['branch_id'], $line['productId'], $line['quantity']]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    return mysql_submit_invoice_to_fbr($pdo, $newReturnId, !empty($input['simulateFbrOffline']));
}

function mysql_hold_cart(PDO $pdo, array $input): array
{
    if (empty($input['items']) || !is_array($input['items'])) {
        throw new RuntimeException('Cannot hold an empty cart');
    }

    $now = date('Y-m-d H:i:s');
    $holdCode = 'HOLD-' . substr((string)(int)(microtime(true) * 1000), -6);
    $itemCount = 0;
    $itemsTotal = 0.0;
    foreach ($input['items'] as $i) {
        $q = (float)$i['quantity'];
        $itemCount += (int)$q;
        $net = max(0.0, (float)$i['unitPrice'] * $q - (float)($i['discountAmount'] ?? 0));
        $itemsTotal += $net * (1 + ((float)$i['taxRate']) / 100);
    }
    $discountTotal = round_money((float)($input['discountTotal'] ?? 0));
    $totalAmount = round_money(max(0.0, $itemsTotal - $discountTotal));

    $pdo->prepare(
        'INSERT INTO held_carts (
           hold_code, branch_id, customer_id, customer_name, user_id, cashier_name,
           items_json, discount_total, notes, total_amount, item_count, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $holdCode,
        (int)$input['branchId'],
        !empty($input['customerId']) ? (int)$input['customerId'] : null,
        (string)$input['customerName'],
        !empty($input['userId']) ? (int)$input['userId'] : null,
        (string)($input['cashierName'] ?? 'Cashier'),
        json_encode($input['items']),
        $discountTotal,
        trim((string)($input['notes'] ?? '')),
        $totalAmount,
        $itemCount,
        $now,
    ]);

    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT h.*, b.display_name AS branch_display_name
         FROM held_carts h
         JOIN branches b ON b.id = h.branch_id
         WHERE h.id = ?'
    );
    $stmt->execute([$id]);
    return cast_held_cart($stmt->fetch());
}

function mysql_list_held_carts(PDO $pdo, ?int $branchId = null): array
{
    if ($branchId) {
        $stmt = $pdo->prepare(
            'SELECT h.*, b.display_name AS branch_display_name
             FROM held_carts h
             JOIN branches b ON b.id = h.branch_id
             WHERE h.branch_id = ?
             ORDER BY h.created_at DESC, h.id DESC'
        );
        $stmt->execute([$branchId]);
        return array_map('cast_held_cart', $stmt->fetchAll());
    }
    $rows = $pdo->query(
        'SELECT h.*, b.display_name AS branch_display_name
         FROM held_carts h
         JOIN branches b ON b.id = h.branch_id
         ORDER BY h.created_at DESC, h.id DESC'
    )->fetchAll();
    return array_map('cast_held_cart', $rows);
}

function mysql_delete_held_cart(PDO $pdo, int $id): void
{
    $pdo->prepare('DELETE FROM held_carts WHERE id = ?')->execute([$id]);
}

function mysql_get_day_closing_preview(PDO $pdo, int $branchId, string $closingDate, float $openingCash = 0.0): array
{
    $bStmt = $pdo->prepare('SELECT id, display_name FROM branches WHERE id = ?');
    $bStmt->execute([$branchId]);
    $branch = $bStmt->fetch();
    if (!$branch) {
        throw new RuntimeException('Branch not found');
    }

    $aggStmt = $pdo->prepare(
        "SELECT
           COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN total_amount ELSE 0 END), 0) AS gross_sales,
           COUNT(CASE WHEN invoice_type = 'SALE' THEN 1 END) AS sales_count,
           COALESCE(SUM(CASE WHEN invoice_type = 'RETURN' THEN total_amount ELSE 0 END), 0) AS returns_total,
           COUNT(CASE WHEN invoice_type = 'RETURN' THEN 1 END) AS returns_count,
           COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN cash_amount ELSE 0 END), 0) AS cash_sales,
           COALESCE(SUM(CASE WHEN invoice_type = 'RETURN' THEN cash_amount ELSE 0 END), 0) AS cash_refunds,
           COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN card_amount ELSE -card_amount END), 0) AS card_sales,
           COALESCE(SUM(CASE WHEN invoice_type = 'SALE' THEN bank_amount ELSE -bank_amount END), 0) AS bank_sales
         FROM invoices
         WHERE branch_id = ? AND invoice_date = ?"
    );
    $aggStmt->execute([$branchId, $closingDate]);
    $agg = $aggStmt->fetch();

    $exStmt = $pdo->prepare(
        'SELECT dc.*, b.display_name AS branch_display_name
         FROM day_closings dc
         JOIN branches b ON b.id = dc.branch_id
         WHERE dc.branch_id = ? AND dc.closing_date = ?'
    );
    $exStmt->execute([$branchId, $closingDate]);
    $existing = $exStmt->fetch();

    $grossSales = round_money((float)$agg['gross_sales']);
    $returnsTotal = round_money((float)$agg['returns_total']);
    $netSales = round_money($grossSales - $returnsTotal);
    $cashSales = round_money((float)$agg['cash_sales']);
    $cashRefunds = round_money((float)$agg['cash_refunds']);
    $effectiveOpening = $existing ? (float)$existing['opening_cash'] : round_money($openingCash);
    $expectedCash = round_money($effectiveOpening + $cashSales - $cashRefunds);

    return [
        'branch_id' => (int)$branch['id'],
        'branch_display_name' => (string)$branch['display_name'],
        'closing_date' => $closingDate,
        'opening_cash' => $effectiveOpening,
        'gross_sales' => $grossSales,
        'sales_count' => (int)$agg['sales_count'],
        'returns_total' => $returnsTotal,
        'returns_count' => (int)$agg['returns_count'],
        'net_sales' => $netSales,
        'cash_sales' => $cashSales,
        'cash_refunds' => $cashRefunds,
        'card_sales' => round_money((float)$agg['card_sales']),
        'bank_sales' => round_money((float)$agg['bank_sales']),
        'expected_cash' => $expectedCash,
        'already_closed' => $existing ? cast_day_closing($existing) : null,
    ];
}

function mysql_submit_day_closing(PDO $pdo, array $input): array
{
    $branchId = (int)$input['branchId'];
    $closingDate = (string)$input['closingDate'];
    $openingCash = (float)($input['openingCash'] ?? 0);
    $preview = mysql_get_day_closing_preview($pdo, $branchId, $closingDate, $openingCash);
    if ($preview['already_closed'] !== null) {
        throw new RuntimeException("Day closing for {$closingDate} is already finalized.");
    }

    $now = date('Y-m-d H:i:s');
    $netCash = round_money($preview['cash_sales'] - $preview['cash_refunds']);
    $counted = round_money((float)$input['countedCash']);
    $variance = round_money($counted - $preview['expected_cash']);

    $pdo->prepare(
        'INSERT INTO day_closings (
           branch_id, closing_date, user_id, closed_by_name, opening_cash,
           gross_sales, returns_total, net_sales, cash_received, card_received, bank_received,
           expected_cash, counted_cash, variance, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $branchId,
        $closingDate,
        !empty($input['userId']) ? (int)$input['userId'] : null,
        trim((string)($input['closedByName'] ?? 'Manager')) ?: 'Manager',
        round_money($openingCash),
        $preview['gross_sales'],
        $preview['returns_total'],
        $preview['net_sales'],
        $netCash,
        $preview['card_sales'],
        $preview['bank_sales'],
        $preview['expected_cash'],
        $counted,
        $variance,
        trim((string)($input['notes'] ?? '')),
        $now,
    ]);

    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT dc.*, b.display_name AS branch_display_name
         FROM day_closings dc
         JOIN branches b ON b.id = dc.branch_id
         WHERE dc.id = ?'
    );
    $stmt->execute([$id]);
    return cast_day_closing($stmt->fetch());
}

function mysql_list_day_closings(PDO $pdo, ?int $branchId = null): array
{
    if ($branchId) {
        $stmt = $pdo->prepare(
            'SELECT dc.*, b.display_name AS branch_display_name
             FROM day_closings dc
             JOIN branches b ON b.id = dc.branch_id
             WHERE dc.branch_id = ?
             ORDER BY dc.closing_date DESC, dc.id DESC'
        );
        $stmt->execute([$branchId]);
        return array_map('cast_day_closing', $stmt->fetchAll());
    }
    $rows = $pdo->query(
        'SELECT dc.*, b.display_name AS branch_display_name
         FROM day_closings dc
         JOIN branches b ON b.id = dc.branch_id
         ORDER BY dc.closing_date DESC, dc.id DESC'
    )->fetchAll();
    return array_map('cast_day_closing', $rows);
}

function mysql_get_reports_data(PDO $pdo, ?int $branchId, string $fromDate, string $toDate): array
{
    $branchSql = $branchId ? 'AND i.branch_id = ?' : '';
    $baseParams = $branchId ? [$fromDate, $toDate, $branchId] : [$fromDate, $toDate];

    $bWhere = $branchId ? 'AND b.id = ?' : '';
    $bStmt = $pdo->prepare(
        "SELECT
           b.id AS branch_id,
           b.display_name,
           COUNT(CASE WHEN i.invoice_type = 'SALE' THEN 1 END) AS invoice_count,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE 0 END), 0) AS gross_sales,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.total_amount ELSE 0 END), 0) AS returns_total,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.total_amount ELSE -i.total_amount END), 0) AS net_sales,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE -i.tax_total END), 0) AS net_tax
         FROM branches b
         LEFT JOIN invoices i
           ON i.branch_id = b.id AND i.invoice_date >= ? AND i.invoice_date <= ?
         WHERE b.is_active = 1 {$bWhere}
         GROUP BY b.id, b.display_name
         ORDER BY net_sales DESC"
    );
    $bStmt->execute($baseParams);
    $branchComparison = array_map(function (array $r): array {
        return [
            'branch_id' => (int)$r['branch_id'],
            'display_name' => (string)$r['display_name'],
            'invoice_count' => (int)$r['invoice_count'],
            'gross_sales' => round_money((float)$r['gross_sales']),
            'returns_total' => round_money((float)$r['returns_total']),
            'net_sales' => round_money((float)$r['net_sales']),
            'net_tax' => round_money((float)$r['net_tax']),
        ];
    }, $bStmt->fetchAll());

    $pStmt = $pdo->prepare(
        "SELECT
           ii.product_id,
           ii.sku,
           ii.item_name,
           SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.quantity ELSE -ii.quantity END) AS net_qty,
           SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.line_total ELSE -ii.line_total END) AS net_revenue,
           SUM(CASE WHEN i.invoice_type = 'SALE' THEN ii.tax_charged ELSE -ii.tax_charged END) AS net_tax
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         WHERE i.invoice_date >= ? AND i.invoice_date <= ? {$branchSql}
         GROUP BY ii.product_id, ii.sku, ii.item_name
         ORDER BY net_revenue DESC
         LIMIT 20"
    );
    $pStmt->execute($baseParams);
    $topProducts = array_map(function (array $r): array {
        return [
            'product_id' => (int)$r['product_id'],
            'sku' => (string)$r['sku'],
            'item_name' => (string)$r['item_name'],
            'net_qty' => (float)$r['net_qty'],
            'net_revenue' => round_money((float)$r['net_revenue']),
            'net_tax' => round_money((float)$r['net_tax']),
        ];
    }, $pStmt->fetchAll());

    $tStmt = $pdo->prepare(
        "SELECT
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN (i.subtotal - i.discount_total) ELSE 0 END), 0) AS taxable_sales,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'SALE' THEN i.tax_total ELSE 0 END), 0) AS output_tax,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN (i.subtotal - i.discount_total) ELSE 0 END), 0) AS return_taxable,
           COALESCE(SUM(CASE WHEN i.invoice_type = 'RETURN' THEN i.tax_total ELSE 0 END), 0) AS return_tax
         FROM invoices i
         WHERE i.invoice_date >= ? AND i.invoice_date <= ? {$branchSql}"
    );
    $tStmt->execute($baseParams);
    $tax = $tStmt->fetch();

    if ($branchId) {
        $lStmt = $pdo->prepare(
            'SELECT l.* FROM fbr_sync_logs l JOIN invoices i ON i.id = l.invoice_id
             WHERE i.branch_id = ? ORDER BY l.created_at DESC, l.id DESC LIMIT 50'
        );
        $lStmt->execute([$branchId]);
    } else {
        $lStmt = $pdo->query('SELECT * FROM fbr_sync_logs ORDER BY created_at DESC, id DESC LIMIT 50');
    }
    $fbrLogs = array_map(function (array $r): array {
        $r['id'] = (int)$r['id'];
        $r['invoice_id'] = (int)$r['invoice_id'];
        $r['http_status'] = $r['http_status'] !== null ? (int)$r['http_status'] : null;
        $r['success'] = (int)$r['success'];
        return $r;
    }, $lStmt->fetchAll());

    $outputTax = round_money((float)$tax['output_tax']);
    $returnTax = round_money((float)$tax['return_tax']);

    return [
        'branchComparison' => $branchComparison,
        'topProducts' => $topProducts,
        'taxSummary' => [
            'taxable_sales' => round_money((float)$tax['taxable_sales']),
            'output_tax' => $outputTax,
            'return_taxable' => round_money((float)$tax['return_taxable']),
            'return_tax' => $returnTax,
            'net_tax_payable' => round_money($outputTax - $returnTax),
        ],
        'fbrLogs' => $fbrLogs,
    ];
}

function mysql_save_branch_and_terminal(PDO $pdo, array $input): array
{
    $now = date('Y-m-d H:i:s');
    $name = trim((string)$input['name']);
    $displayName = 'SEASTONE RETAIL OUTLET ( ' . strtoupper($name) . ' )';

    $pdo->beginTransaction();
    try {
        $branchId = !empty($input['branchId']) ? (int)$input['branchId'] : null;
        if ($branchId) {
            $pdo->prepare(
                'UPDATE branches SET code = ?, name = ?, display_name = ?, address = ?, phone = ? WHERE id = ?'
            )->execute([
                trim((string)$input['code']),
                $name,
                $displayName,
                trim((string)($input['address'] ?? '')),
                trim((string)($input['phone'] ?? '')),
                $branchId,
            ]);
        } else {
            $pdo->prepare(
                'INSERT INTO branches (code, name, display_name, address, phone, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?)'
            )->execute([
                trim((string)$input['code']),
                $name,
                $displayName,
                trim((string)($input['address'] ?? '')),
                trim((string)($input['phone'] ?? '')),
                $now,
            ]);
            $branchId = (int)$pdo->lastInsertId();

            $pdo->prepare(
                'INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
                 VALUES (?, ?, "", "", "", 1, ?)'
            )->execute([$branchId, "Walk-in (Cash) Customer ( {$name} )", $now]);

            $prodIds = $pdo->query('SELECT id FROM products')->fetchAll(PDO::FETCH_COLUMN);
            $invIgnoreSql = is_sqlite_pdo($pdo)
                ? 'INSERT OR IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)'
                : 'INSERT IGNORE INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, 0)';
            $invStmt = $pdo->prepare($invIgnoreSql);
            foreach ($prodIds as $pid) {
                $invStmt->execute([$branchId, (int)$pid]);
            }
        }

        if (!empty($input['terminalId'])) {
            $pdo->prepare(
                'UPDATE pos_terminals
                 SET terminal_code = ?, invoice_prefix = ?, fbr_pos_id = ?, fbr_token = ?, fbr_mode = ?
                 WHERE id = ?'
            )->execute([
                trim((string)$input['terminalCode']),
                trim((string)$input['invoicePrefix']),
                trim((string)$input['fbrPosId']),
                trim((string)($input['fbrToken'] ?? '')),
                (string)($input['fbrMode'] ?? 'MOCK'),
                (int)$input['terminalId'],
            ]);
        } else {
            $pdo->prepare(
                'INSERT INTO pos_terminals (branch_id, terminal_code, invoice_prefix, next_sequence, fbr_pos_id, fbr_token, fbr_mode, is_active)
                 VALUES (?, ?, ?, 1, ?, ?, ?, 1)'
            )->execute([
                $branchId,
                trim((string)$input['terminalCode']),
                trim((string)$input['invoicePrefix']),
                trim((string)$input['fbrPosId']),
                trim((string)($input['fbrToken'] ?? '')),
                (string)($input['fbrMode'] ?? 'MOCK'),
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    return mysql_get_branches_with_terminals($pdo);
}
