import { useEffect } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

interface Order {
  order_number: string;
  created_at: string;
  delivery_type: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  subtotal: number;
  service_fee?: number;
  delivery_fee?: number;
  discount?: number;
  total: number;
  payment_method: string;
  notes?: string;
  order_items: OrderItem[];
  operator_name?: string;
  sequential_number?: number;
}

interface PrintReceiptProps {
  order: Order;
  restaurantName: string;
  tableNumber?: number;
  type?: 'kitchen' | 'customer';
  via?: number;
}

// Generate barcode-style visual (simple ASCII representation)
const generateBarcodeHtml = (text: string) => {
  return `
    <div style="font-family: 'Libre Barcode 128', monospace; font-size: 48px; text-align: center; letter-spacing: 2px;">
      *${text}*
    </div>
  `;
};

// Get order channel label
const getOrderChannelLabel = (deliveryType: string, orderNumber: string) => {
  if (orderNumber.startsWith('TOTEM')) return 'TOTEM';
  if (orderNumber.startsWith('MESA') || orderNumber.startsWith('M')) return 'MESA';
  if (orderNumber.startsWith('PED')) return 'ONLINE';
  if (deliveryType === 'dine_in') return 'BALCÃO';
  if (deliveryType === 'delivery') return 'DELIVERY';
  if (deliveryType === 'pickup') return 'RETIRADA';
  return 'BALCÃO';
};

export const PrintReceipt = ({ order, restaurantName, tableNumber, type = 'customer', via = 1 }: PrintReceiptProps) => {
  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = type === 'kitchen' 
      ? generateKitchenReceipt(order, restaurantName, tableNumber)
      : generateCustomerReceipt(order, restaurantName, tableNumber, via);

    printWindow.document.write(content);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  useEffect(() => {
    printReceipt();
  }, []);

  return null;
};

// Customer receipt - Complete with all details
const generateCustomerReceipt = (order: Order, restaurantName: string, tableNumber?: number, via: number = 1) => {
  const channel = getOrderChannelLabel(order.delivery_type, order.order_number);
  const paymentLabel = {
    'cash': 'Dinheiro',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'PIX',
    'pending': 'Pendente'
  }[order.payment_method] || order.payment_method;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido ${order.order_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .restaurant-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .via-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin-bottom: 4px;
          }
          .channel-badge {
            display: inline-block;
            border: 2px solid #000;
            padding: 4px 12px;
            font-weight: bold;
            font-size: 14px;
            margin: 8px 0;
          }
          .section {
            margin: 8px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .row-bold {
            font-weight: bold;
          }
          .items {
            margin: 8px 0;
          }
          .item {
            margin: 6px 0;
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .item-notes {
            font-size: 9px;
            font-style: italic;
            margin-left: 12px;
            color: #666;
          }
          .totals {
            margin: 8px 0;
            padding: 8px;
            background: #f5f5f5;
          }
          .total-final {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            padding: 8px;
            border: 2px solid #000;
            margin: 8px 0;
          }
          .barcode {
            text-align: center;
            margin: 12px 0;
            font-family: 'Libre Barcode 128', monospace;
            font-size: 40px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 9px;
          }
          .sequential {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-top: 8px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="via-badge">VIA ${via} DE 2</div>
          <div class="restaurant-name">${restaurantName}</div>
          <div class="channel-badge">[${channel}]</div>
        </div>

        <div class="barcode">*${order.customer_name?.toUpperCase().replace(/\s+/g, '') || order.order_number}*</div>

        <div class="section">
          <div class="row">
            <span>Pedido:</span>
            <strong>${order.order_number}</strong>
          </div>
          <div class="row">
            <span>Data:</span>
            <span>${new Date(order.created_at).toLocaleString('pt-BR')}</span>
          </div>
          ${order.operator_name ? `
            <div class="row">
              <span>Operador:</span>
              <span>${order.operator_name}</span>
            </div>
          ` : ''}
          ${tableNumber ? `
            <div class="row">
              <span>Mesa:</span>
              <strong>${tableNumber}</strong>
            </div>
          ` : ''}
        </div>

        ${order.customer_name || order.customer_phone ? `
          <div class="section">
            ${order.customer_name ? `<div class="row"><span>Cliente:</span><span>${order.customer_name}</span></div>` : ''}
            ${order.customer_phone ? `<div class="row"><span>Telefone:</span><span>${order.customer_phone}</span></div>` : ''}
            ${order.customer_cpf ? `<div class="row"><span>CPF:</span><span>${order.customer_cpf}</span></div>` : ''}
          </div>
        ` : ''}

        <div class="items">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">ITENS DO PEDIDO:</div>
          ${order.order_items.map((item, idx) => `
            <div class="item">
              <div class="item-header">
                <span>${idx + 1}. ${item.quantity}x ${item.name}</span>
                <span>R$ ${item.total_price.toFixed(2)}</span>
              </div>
              ${item.notes ? `<div class="item-notes">↳ ${item.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="row">
            <span>Subtotal:</span>
            <span>R$ ${order.subtotal.toFixed(2)}</span>
          </div>
          ${order.service_fee && order.service_fee > 0 ? `
            <div class="row">
              <span>Taxa de Serviço (10%):</span>
              <span>R$ ${order.service_fee.toFixed(2)}</span>
            </div>
          ` : ''}
          ${order.delivery_fee && order.delivery_fee > 0 ? `
            <div class="row">
              <span>Taxa de Entrega:</span>
              <span>R$ ${order.delivery_fee.toFixed(2)}</span>
            </div>
          ` : ''}
          ${order.discount && order.discount > 0 ? `
            <div class="row" style="color: green;">
              <span>Desconto:</span>
              <span>-R$ ${order.discount.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div class="total-final">
          TOTAL A RECEBER: R$ ${order.total.toFixed(2)}
        </div>

        <div class="section">
          <div class="row row-bold">
            <span>Forma de Pagamento:</span>
            <span>${paymentLabel}</span>
          </div>
        </div>

        ${order.notes ? `
          <div class="section">
            <div style="font-weight: bold;">Observações:</div>
            <div style="font-style: italic;">${order.notes}</div>
          </div>
        ` : ''}

        ${order.sequential_number ? `
          <div class="sequential">
            Compra Nº ${order.sequential_number.toString().padStart(6, '0')}
          </div>
        ` : ''}

        <div class="footer">
          <div>━━━━━━━━━━━━━━━━━━━━━━</div>
          <div style="margin: 4px 0;">Obrigado pela preferência!</div>
          <div style="font-size: 8px;">${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </body>
    </html>
  `;
};

// Kitchen receipt - Compact and focused on items
const generateKitchenReceipt = (order: Order, restaurantName: string, tableNumber?: number) => {
  const channel = getOrderChannelLabel(order.delivery_type, order.order_number);
  const isPaid = order.payment_method !== 'pending';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cozinha - ${order.order_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.4;
            max-width: 80mm;
            margin: 0 auto;
            padding: 8px;
            background: white;
          }
          .header {
            text-align: center;
            padding-bottom: 10px;
            margin-bottom: 10px;
            border-bottom: 3px solid #000;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
          }
          .paid-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 4px 16px;
            font-size: 16px;
            font-weight: bold;
            margin: 6px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
          }
          .items {
            margin: 12px 0;
            padding: 8px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
          }
          .item {
            margin: 8px 0;
            padding: 6px;
            background: #f5f5f5;
          }
          .item-qty {
            font-size: 18px;
            font-weight: bold;
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 8px;
            margin-right: 8px;
          }
          .item-name {
            font-size: 14px;
            font-weight: bold;
          }
          .item-notes {
            font-size: 12px;
            margin-left: 40px;
            color: #666;
            font-style: italic;
          }
          .barcode {
            text-align: center;
            margin: 10px 0;
            font-family: 'Libre Barcode 128', monospace;
            font-size: 36px;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
          }
          .signature {
            margin-top: 20px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 80%;
            margin: 0 auto 4px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${order.customer_name || 'Cliente'}</div>
          ${isPaid ? '<div class="paid-badge">✓ PAGO</div>' : '<div class="paid-badge" style="background: #ff4444;">PENDENTE</div>'}
        </div>

        <div>
          <div class="info-row">
            <span>Pedido:</span>
            <strong>${order.order_number}</strong>
          </div>
          <div class="info-row">
            <span>Data/Hora:</span>
            <span>${new Date(order.created_at).toLocaleString('pt-BR')}</span>
          </div>
          ${tableNumber ? `
            <div class="info-row">
              <span>Mesa:</span>
              <strong style="font-size: 16px;">${tableNumber}</strong>
            </div>
          ` : ''}
          <div class="info-row">
            <span>Canal:</span>
            <strong>[${channel}]</strong>
          </div>
          <div class="info-row">
            <span>Total:</span>
            <strong>R$ ${order.total.toFixed(2)}</strong>
          </div>
        </div>

        <div class="items">
          ${order.order_items.map(item => `
            <div class="item">
              <span class="item-qty">${item.quantity}x</span>
              <span class="item-name">${item.name}</span>
              ${item.notes ? `<div class="item-notes">↳ ${item.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>

        ${order.notes ? `
          <div style="background: #ffffcc; padding: 8px; margin: 8px 0; font-weight: bold;">
            ⚠️ OBS: ${order.notes}
          </div>
        ` : ''}

        <div class="barcode">*${order.order_number}*</div>

        <div class="signature">
          <div class="signature-line"></div>
          <div style="font-size: 10px;">Responsável pela Preparação</div>
        </div>

        <div class="footer">
          <div>${restaurantName}</div>
        </div>
      </body>
    </html>
  `;
};

export const generatePrintReceipt = (
  order: Order, 
  restaurantName: string, 
  tableNumber?: number, 
  type: 'kitchen' | 'customer' = 'customer',
  via: number = 1
) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    document.body.removeChild(div);
    return;
  }

  const content = type === 'kitchen' 
    ? generateKitchenReceipt(order, restaurantName, tableNumber)
    : generateCustomerReceipt(order, restaurantName, tableNumber, via);

  printWindow.document.write(content);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
    document.body.removeChild(div);
  }, 250);
};

// Print both customer vias
export const printCustomerReceipts = (order: Order, restaurantName: string, tableNumber?: number) => {
  // Via 1
  generatePrintReceipt(order, restaurantName, tableNumber, 'customer', 1);
  // Via 2 after small delay
  setTimeout(() => {
    generatePrintReceipt(order, restaurantName, tableNumber, 'customer', 2);
  }, 500);
};
