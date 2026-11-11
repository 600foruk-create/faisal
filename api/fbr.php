<?php
declare(strict_types=1);

const FBR_ENDPOINTS = [
    'SANDBOX' => 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb',
    'PRODUCTION' => 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata',
];

function map_payment_mode_to_fbr(string $mode): int
{
    switch ($mode) {
        case 'CASH':
            return 1;
        case 'CARD':
            return 2;
        case 'BANK':
            return 6;
        case 'SPLIT':
            return 5;
        default:
            return 1;
    }
}

function build_fbr_invoice_payload(
    array $invoice,
    array $items,
    string $posId,
    string $buyerPhone = '',
    string $buyerCnic = '',
    string $buyerNtn = '',
    ?string $refUsin = null
): array {
    $isReturn = ($invoice['invoice_type'] ?? 'SALE') === 'RETURN';
    $fbrInvoiceType = $isReturn ? 3 : 1;

    $totalQty = 0.0;
    $totalSaleValue = 0.0;
    $totalTax = 0.0;
    $mappedItems = [];

    foreach ($items as $item) {
        $qty = abs((float)$item['quantity']);
        $netSale = round_money(abs((float)$item['quantity'] * (float)$item['unit_price'] - (float)$item['discount_amount']));
        $tax = round_money(abs((float)$item['tax_charged']));
        $disc = round_money(abs((float)$item['discount_amount']));

        $totalQty = round_money($totalQty + $qty);
        $totalSaleValue = round_money($totalSaleValue + $netSale);
        $totalTax = round_money($totalTax + $tax);

        $mappedItems[] = [
            'ItemCode' => (string)$item['sku'],
            'ItemName' => (string)$item['item_name'],
            'Quantity' => $qty,
            'SaleValue' => $netSale,
            'TaxRate' => (float)$item['tax_rate'],
            'TaxCharged' => $tax,
            'Discount' => $disc,
            'TotalAmount' => round_money($netSale + $tax),
            'InvoiceType' => $fbrInvoiceType,
        ];
    }

    $numericPosId = preg_match('/^\d+$/', $posId) ? (int)$posId : $posId;

    return [
        'InvoiceNumber' => '',
        'POSID' => $numericPosId,
        'USIN' => (string)$invoice['usin'],
        'DateTime' => substr(str_replace('T', ' ', (string)$invoice['created_at']), 0, 19),
        'BuyerNTN' => $buyerNtn,
        'BuyerCNIC' => $buyerCnic,
        'BuyerName' => (string)$invoice['customer_name'],
        'BuyerPhoneNumber' => $buyerPhone,
        'TotalBillAmount' => round_money(abs((float)$invoice['total_amount'])),
        'TotalQuantity' => $totalQty,
        'TotalSaleValue' => $totalSaleValue,
        'TotalTaxCharged' => $totalTax,
        'Discount' => round_money(abs((float)$invoice['discount_total'])),
        'FurtherTax' => 0,
        'PaymentMode' => map_payment_mode_to_fbr((string)$invoice['payment_mode']),
        'InvoiceType' => $fbrInvoiceType,
        'RefUSIN' => $refUsin,
        'Items' => $mappedItems,
    ];
}

function build_fbr_qr_payload(array $invoice): string
{
    $fbrNo = $invoice['fbr_invoice_no'] ?? null;
    $posId = $invoice['fbr_pos_id'] ?? '';
    $usin = (string)$invoice['usin'];
    $invoiceNo = (string)$invoice['invoice_no'];
    $total = round_money((float)$invoice['total_amount']);
    $dateTime = (string)$invoice['created_at'];

    if ($fbrNo) {
        return json_encode([
            'FBRInvoiceNumber' => $fbrNo,
            'POSID' => $posId,
            'USIN' => $usin,
            'InvoiceNo' => $invoiceNo,
            'Total' => $total,
            'DateTime' => $dateTime,
        ], JSON_UNESCAPED_SLASHES) ?: '';
    }

    return "PENDING_FBR|POSID={$posId}|USIN={$usin}|INV={$invoiceNo}|TOTAL={$total}";
}

function dispatch_to_fbr(string $mode, string $token, array $payload, bool $simulateOffline = false): array
{
    if ($simulateOffline) {
        return [
            'success' => false,
            'httpStatus' => 503,
            'fbrInvoiceNo' => null,
            'errorMessage' => 'Simulated offline / FBR gateway timeout. Queued for retry.',
            'requestPayload' => $payload,
            'responsePayload' => json_encode(['Code' => '503', 'Response' => 'Offline simulation active']),
        ];
    }

    if ($mode === 'MOCK') {
        $suffix = substr((string)(int)(microtime(true) * 1000), -8);
        $posDigits = preg_replace('/\D/', '', (string)($payload['POSID'] ?? '100001')) ?: '100001';
        $posStr = substr($posDigits, 0, 6);
        $dateCompact = str_replace('-', '', substr((string)$payload['DateTime'], 2, 8));
        $generatedNo = "{$posStr}{$dateCompact}{$suffix}";

        return [
            'success' => true,
            'httpStatus' => 200,
            'fbrInvoiceNo' => $generatedNo,
            'errorMessage' => null,
            'requestPayload' => $payload,
            'responsePayload' => json_encode([
                'InvoiceNumber' => $generatedNo,
                'Code' => '100',
                'Response' => 'Invoice received successfully (Mock FBR Mode)',
                'Errors' => '',
            ]),
        ];
    }

    $endpoint = FBR_ENDPOINTS[$mode] ?? null;
    if ($endpoint === null) {
        return [
            'success' => false,
            'httpStatus' => 400,
            'fbrInvoiceNo' => null,
            'errorMessage' => "Unsupported FBR mode: {$mode}",
            'requestPayload' => $payload,
            'responsePayload' => json_encode(['error' => 'Unsupported FBR mode']),
        ];
    }

    if (trim($token) === '') {
        return [
            'success' => false,
            'httpStatus' => 401,
            'fbrInvoiceNo' => null,
            'errorMessage' => "FBR {$mode} Bearer Token is not configured for this terminal.",
            'requestPayload' => $payload,
            'responsePayload' => json_encode(['error' => 'Missing FBR Bearer Token']),
        ];
    }

    if (!function_exists('curl_init')) {
        return [
            'success' => false,
            'httpStatus' => null,
            'fbrInvoiceNo' => null,
            'errorMessage' => 'PHP cURL extension is required for live FBR requests.',
            'requestPayload' => $payload,
            'responsePayload' => json_encode(['error' => 'Missing php-curl']),
        ];
    }

    $ch = curl_init($endpoint);
    $jsonBody = json_encode($payload);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . trim($token),
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $jsonBody,
    ]);

    $raw = curl_exec($ch);
    $curlErr = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        return [
            'success' => false,
            'httpStatus' => null,
            'fbrInvoiceNo' => null,
            'errorMessage' => $curlErr !== '' ? $curlErr : 'Network error contacting FBR',
            'requestPayload' => $payload,
            'responsePayload' => json_encode(['error' => $curlErr]),
        ];
    }

    $parsed = json_decode((string)$raw, true);
    if (!is_array($parsed)) {
        $parsed = ['raw' => (string)$raw];
    }

    $invNo = isset($parsed['InvoiceNumber']) && is_string($parsed['InvoiceNumber']) && trim($parsed['InvoiceNumber']) !== ''
        ? trim($parsed['InvoiceNumber'])
        : null;
    $code = isset($parsed['Code']) ? (string)$parsed['Code'] : '';

    if ($httpCode >= 200 && $httpCode < 300 && $invNo !== null && ($code === '' || $code === '100')) {
        return [
            'success' => true,
            'httpStatus' => $httpCode,
            'fbrInvoiceNo' => $invNo,
            'errorMessage' => null,
            'requestPayload' => $payload,
            'responsePayload' => (string)$raw,
        ];
    }

    $errMsg = (is_string($parsed['Response'] ?? null) && $parsed['Response'] !== '')
        ? $parsed['Response']
        : ((is_string($parsed['Errors'] ?? null) && $parsed['Errors'] !== '')
            ? $parsed['Errors']
            : "FBR returned HTTP {$httpCode}");

    return [
        'success' => false,
        'httpStatus' => $httpCode,
        'fbrInvoiceNo' => null,
        'errorMessage' => $errMsg,
        'requestPayload' => $payload,
        'responsePayload' => (string)$raw,
    ];
}
