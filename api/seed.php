<?php
declare(strict_types=1);

function build_sample_line_item(
    int $productId,
    string $sku,
    string $name,
    float $qty,
    float $targetLineTotal,
    float $taxRate
): array {
    $subtotal = round_money($targetLineTotal / (1 + $taxRate / 100));
    $taxCharged = round_money($targetLineTotal - $subtotal);
    $unitPrice = round_money($subtotal / $qty);
    return [
        'productId' => $productId,
        'sku' => $sku,
        'name' => $name,
        'qty' => $qty,
        'unitPrice' => $unitPrice,
        'subtotal' => $subtotal,
        'taxRate' => $taxRate,
        'taxCharged' => $taxCharged,
        'lineTotal' => round_money($targetLineTotal),
    ];
}

function seed_initial_mysql_data(PDO $pdo): void
{
    $count = (int)$pdo->query('SELECT COUNT(*) FROM branches')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $nowTs = date('Y-m-d H:i:s');

    $isSqlite = is_sqlite_pdo($pdo);
    $pdo->beginTransaction();
    try {
        $stmtSetting = $pdo->prepare(
            $isSqlite
                ? 'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
                   ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value'
                : 'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
                   ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        $settings = [
            ['software_brand', 'Softifyx'],
            ['business_name', 'M/S SEASTONE PVC PIPE INDUSTRY'],
            ['logo_data_url', ''],
            ['footer_text', 'Designed & Developed by Softifyx Technologies'],
            ['ntn', '4125890-7'],
            ['strn', '3277876124891'],
            ['default_tax_rate', '18'],
            ['default_opening_cash', '5000'],
            ['receipt_footer', 'Thank you for shopping with M/S Seastone PVC Pipe Industry! Verify FBR invoice via Tax Asaan App or SMS to 9966.'],
            ['currency_symbol', 'Rs.'],
        ];
        foreach ($settings as $s) {
            $stmtSetting->execute($s);
        }

        $stmtBranch = $pdo->prepare(
            'INSERT INTO branches (code, name, display_name, address, phone, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)'
        );
        $stmtBranch->execute([
            'MAIN',
            'Main Branch',
            'SEASTONE MAIN OUTLET',
            'Main Chakdara Road, Timergara, Lower Dir',
            '0945-822140',
            $nowTs,
        ]);
        $branch1Id = (int)$pdo->lastInsertId();

        $stmtTerm = $pdo->prepare(
            "INSERT INTO pos_terminals (branch_id, terminal_code, invoice_prefix, next_sequence, fbr_pos_id, fbr_token, fbr_mode, is_active)
             VALUES (?, ?, ?, 1, '104521', 'MOCK-TOKEN-TIMERGARA', 'MOCK', 1)"
        );
        $stmtTerm->execute([$branch1Id, 'POS-01', 'POS-01']);
        $term1Id = (int)$pdo->lastInsertId();

        $stmtUser = $pdo->prepare(
            'INSERT INTO users (username, full_name, password_hash, role, branch_id, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)'
        );
        $adminHash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmtUser->execute(['faisal', 'Faisal (Super Admin)', $adminHash, 'SUPER_ADMIN', $branch1Id, $nowTs]);
        $faisalId = (int)$pdo->lastInsertId();

        $stmtCust = $pdo->prepare(
            'INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmtCust->execute([$branch1Id, 'Walk-in (Cash) Customer', '', '', '', 1, $nowTs]);

        // Clean user rights for Faisal
        $allRights = [
            'my_company' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'my_logo' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'companies_list' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'user_logins' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'user_rights' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'passwords' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'financial_year' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'clear_transactions' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'branches_counters' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'system_settings' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'backup_utility' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'customers' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'chart_of_inventory' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'opening_balances' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'price_settings' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'tax_rates' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'pos_billing' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'hold_recall' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'sales_return' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'day_closing' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'sales_register' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'sale_summary' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'top_products' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'gst_tax_summary' => ['allowed' => true, 'editor' => true, 'viewer' => true],
            'stock_valuation' => ['allowed' => true, 'editor' => true, 'viewer' => true],
        ];
        $json = json_encode($allRights);
        $stmtRights = $pdo->prepare(
            $isSqlite
                ? 'INSERT INTO user_rights (user_id, rights_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(user_id) DO UPDATE SET rights_json = excluded.rights_json'
                : 'INSERT INTO user_rights (user_id, rights_json, updated_at) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE rights_json = VALUES(rights_json)'
        );
        $stmtRights->execute([$json, $nowTs]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

