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

    $pdo->beginTransaction();
    try {
        $stmtSetting = $pdo->prepare(
            'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        $settings = [
            ['business_name', 'SEASTONE RETAIL OUTLET'],
            ['ntn', '4125890-7'],
            ['strn', '3277876124891'],
            ['default_tax_rate', '18'],
            ['receipt_footer', 'Thank you for shopping with Seastone Retail Outlet! Verify FBR invoice via Tax Asaan App or SMS to 9966.'],
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
            'SWT-A',
            'Timergara',
            'SEASTONE RETAIL OUTLET ( TIMERGARA )',
            'Main Chakdara Road, Timergara, Lower Dir',
            '0945-822140',
            $nowTs,
        ]);
        $branch1Id = (int)$pdo->lastInsertId();

        $stmtBranch->execute([
            'SWT-B',
            'Mingora',
            'SEASTONE RETAIL OUTLET ( MINGORA )',
            'GT Road Rahimabad, Mingora, Swat',
            '0946-712490',
            $nowTs,
        ]);
        $branch2Id = (int)$pdo->lastInsertId();

        $stmtTerm = $pdo->prepare(
            "INSERT INTO pos_terminals (branch_id, terminal_code, invoice_prefix, next_sequence, fbr_pos_id, fbr_token, fbr_mode, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 'MOCK', 1)"
        );
        $stmtTerm->execute([$branch1Id, 'TERM-A1', 'SWT-A-POS', 64, '104521', 'MOCK-TOKEN-TIMERGARA']);
        $term1Id = (int)$pdo->lastInsertId();

        $stmtTerm->execute([$branch2Id, 'TERM-B1', 'SWT-B-POS', 74, '104522', 'MOCK-TOKEN-MINGORA']);
        $term2Id = (int)$pdo->lastInsertId();

        $stmtUser = $pdo->prepare(
            'INSERT INTO users (username, full_name, password_hash, role, branch_id, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)'
        );
        $adminHash = password_hash('admin123', PASSWORD_BCRYPT);
        $cashierHash = password_hash('1234', PASSWORD_BCRYPT);

        $stmtUser->execute(['admin', 'Faisal (Owner / Admin)', $adminHash, 'ADMIN', null, $nowTs]);
        $adminId = (int)$pdo->lastInsertId();

        $stmtUser->execute(['cashier.timergara', 'Bilal Khan (Timergara POS)', $cashierHash, 'CASHIER', $branch1Id, $nowTs]);
        $cashier1Id = (int)$pdo->lastInsertId();

        $stmtUser->execute(['cashier.mingora', 'Hamza Ali (Mingora POS)', $cashierHash, 'CASHIER', $branch2Id, $nowTs]);
        $cashier2Id = (int)$pdo->lastInsertId();

        $stmtCust = $pdo->prepare(
            'INSERT INTO customers (branch_id, name, phone, cnic, ntn, is_walk_in, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmtCust->execute([$branch1Id, 'Walk-in (Cash) Customer ( Timergara )', '', '', '', 1, $nowTs]);
        $walk1Id = (int)$pdo->lastInsertId();

        $stmtCust->execute([$branch2Id, 'Walk-in (Cash) Customer ( Mingora )', '', '', '', 1, $nowTs]);
        $walk2Id = (int)$pdo->lastInsertId();

        $stmtCust->execute([$branch1Id, 'Al-Madina Builders & Contractors', '0300-5551234', '15302-4411223-1', '2891042-3', 0, $nowTs]);
        $stmtCust->execute([$branch2Id, 'Swat Marble & Associates', '0345-9008811', '15602-7722119-5', '3104982-1', 0, $nowTs]);

        $seedProducts = [
            ['STN-POR-6060', '8961001000011', 'Seastone Imperial Porcelain Tile 60x60cm (Box)', 'Porcelain Tiles', 'Box', 4400, 3550, 18],
            ['STN-POR-8080', '8961001000028', 'Seastone Carrara Marble Gloss 80x80cm (Box)', 'Porcelain Tiles', 'Box', 6800, 5400, 18],
            ['STN-WALL-3060', '8961001000035', 'Ceramic Wall Tile Ivory Matte 30x60cm (Box)', 'Wall Tiles', 'Box', 3100, 2450, 18],
            ['STN-ADH-20KG', '8961001000042', 'Heavy Duty Tile Bond Adhesive 20kg Bag', 'Adhesives & Grout', 'Bag', 1250, 920, 18],
            ['STN-GRT-05KG', '8961001000059', 'Waterproof Epoxy Tile Grout 5kg', 'Adhesives & Grout', 'Pack', 1850, 1400, 18],
            ['SAN-BAS-101', '8961001000066', 'Modern Countertop Ceramic Wash Basin', 'Sanitary Ware', 'Pcs', 14500, 11200, 18],
            ['SAN-MIX-204', '8961001000073', 'Brushed Steel Basin Mixer Tap', 'Fittings & Taps', 'Pcs', 8200, 6300, 18],
            ['SAN-SHW-305', '8961001000080', 'Thermostatic Rain Shower Set Chrome', 'Fittings & Taps', 'Set', 22400, 17500, 18],
            ['SAN-COM-408', '8961001000097', 'One-Piece Rimless Soft-Close Commode', 'Sanitary Ware', 'Pcs', 32500, 25800, 18],
            ['ACC-TRM-12MM', '8961001000103', 'Anodized Aluminum Tile Edge Trim 2.5m', 'Accessories', 'Pcs', 950, 680, 18],
        ];

        $stmtProd = $pdo->prepare(
            'INSERT INTO products (sku, barcode, name, category, unit, sale_price, cost_price, tax_rate, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
        );
        $stmtInv = $pdo->prepare('INSERT INTO branch_inventory (branch_id, product_id, stock_qty) VALUES (?, ?, ?)');

        $productIds = [];
        foreach ($seedProducts as $idx => $p) {
            $stmtProd->execute([$p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $p[7], $nowTs]);
            $pid = (int)$pdo->lastInsertId();
            $productIds[] = $pid;
            $stmtInv->execute([$branch1Id, $pid, 120 + $idx * 15]);
            $stmtInv->execute([$branch2Id, $pid, 95 + $idx * 12]);
        }

        $stmtInvoice = $pdo->prepare(
            "INSERT INTO invoices (
              invoice_no, usin, invoice_type, original_invoice_id, branch_id, terminal_id,
              customer_id, customer_name, user_id, cashier_name, invoice_date, created_at,
              subtotal, discount_total, tax_total, total_amount, payment_mode,
              cash_amount, card_amount, bank_amount, tendered_amount, change_amount,
              fbr_status, fbr_invoice_no, fbr_pos_id, fbr_error, fbr_submitted_at, notes
            ) VALUES (?, ?, 'SALE', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'CASH', ?, 0, 0, ?, 0, 'SUBMITTED', ?, ?, NULL, ?, '')"
        );
        $stmtItem = $pdo->prepare(
            'INSERT INTO invoice_items (
              invoice_id, product_id, sku, item_name, quantity, unit_price, discount_amount, tax_rate, tax_charged, line_total
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
        );
        $stmtLog = $pdo->prepare(
            "INSERT INTO fbr_sync_logs (
              invoice_id, invoice_no, usin, fbr_pos_id, mode, http_status, success, fbr_invoice_no,
              error_message, request_payload, response_payload, created_at
            ) VALUES (?, ?, ?, ?, 'MOCK', 200, 1, ?, NULL, ?, ?, ?)"
        );

        $seededSales = [
            ['SWT-A-POS-63', "SWT-A-POS-{$today}-0063", $branch1Id, $term1Id, '104521', $walk1Id, 'Walk-in (Cash) Customer ( Timergara )', $cashier1Id, 'Bilal Khan', $today, "{$today} 14:32:10", 61824.00, '1045212611110063', 0, 12],
            ['SWT-B-POS-73', "SWT-B-POS-{$today}-0073", $branch2Id, $term2Id, '104522', $walk2Id, 'Walk-in (Cash) Customer ( Mingora )', $cashier2Id, 'Hamza Ali', $today, "{$today} 13:55:42", 52684.80, '1045222611110073', 1, 6],
            ['SWT-A-POS-62', "SWT-A-POS-{$today}-0062", $branch1Id, $term1Id, '104521', $walk1Id, 'Walk-in (Cash) Customer ( Timergara )', $cashier1Id, 'Bilal Khan', $today, "{$today} 12:41:19", 96028.80, '1045212611110062', 7, 4],
            ['SWT-B-POS-72', "SWT-B-POS-{$today}-0072", $branch2Id, $term2Id, '104522', $walk2Id, 'Walk-in (Cash) Customer ( Mingora )', $cashier2Id, 'Hamza Ali', $today, "{$today} 11:50:05", 84512.00, '1045222611110072', 8, 2],
            ['SWT-A-POS-61', "SWT-A-POS-{$today}-0061", $branch1Id, $term1Id, '104521', $walk1Id, 'Walk-in (Cash) Customer ( Timergara )', $cashier1Id, 'Bilal Khan', $today, "{$today} 10:25:14", 78420.92, '1045212611110061', 5, 4],
            ['SWT-B-POS-71', "SWT-B-POS-{$today}-0071", $branch2Id, $term2Id, '104522', $walk2Id, 'Walk-in (Cash) Customer ( Mingora )', $cashier2Id, 'Hamza Ali', $today, "{$today} 09:40:30", 86425.00, '1045222611110071', 6, 9],
            ['SWT-A-POS-60', "SWT-A-POS-{$yesterday}-0060", $branch1Id, $term1Id, '104521', $walk1Id, 'Walk-in (Cash) Customer ( Timergara )', $adminId, 'Faisal', $yesterday, "{$yesterday} 16:10:00", 42480.00, '1045212611100060', 2, 10],
            ['SWT-B-POS-70', "SWT-B-POS-{$yesterday}-0070", $branch2Id, $term2Id, '104522', $walk2Id, 'Walk-in (Cash) Customer ( Mingora )', $cashier2Id, 'Hamza Ali', $yesterday, "{$yesterday} 15:05:12", 35400.00, '1045222611100070', 3, 24],
        ];

        foreach ($seededSales as $s) {
            $prod = $seedProducts[$s[13]];
            $pid = $productIds[$s[13]];
            $item = build_sample_line_item($pid, $prod[0], $prod[2], (float)$s[14], (float)$s[11], (float)$prod[7]);

            $stmtInvoice->execute([
                $s[0], $s[1], $s[2], $s[3], $s[5], $s[6], $s[7], $s[8], $s[9], $s[10],
                $item['subtotal'], $item['taxCharged'], $item['lineTotal'],
                $item['lineTotal'], $item['lineTotal'],
                $s[12], $s[4], $s[10],
            ]);
            $invoiceId = (int)$pdo->lastInsertId();

            $stmtItem->execute([
                $invoiceId,
                $item['productId'],
                $item['sku'],
                $item['name'],
                $item['qty'],
                $item['unitPrice'],
                $item['taxRate'],
                $item['taxCharged'],
                $item['lineTotal'],
            ]);

            $stmtLog->execute([
                $invoiceId,
                $s[0],
                $s[1],
                $s[4],
                $s[12],
                json_encode(['USIN' => $s[1], 'POSID' => (int)$s[4], 'TotalBillAmount' => $item['lineTotal']]),
                json_encode(['InvoiceNumber' => $s[12], 'Code' => '100', 'Response' => 'Seeded Verified']),
                $s[10],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
