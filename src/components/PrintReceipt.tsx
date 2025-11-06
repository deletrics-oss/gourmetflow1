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
  subtotal: number;
  total: number;
  payment_method: string;
  notes?: string;
  order_items: OrderItem[];
}

interface PrintReceiptProps {
  order: Order;
  restaurantName: string;
  tableNumber?: number;
  type?: 'kitchen' | 'customer';
}

export const PrintReceipt = ({ order, restaurantName, tableNumber, type = 'customer' }: PrintReceiptProps) => {
  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido ${order.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .section {
              margin: 10px 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items {
              margin: 10px 0;
            }
            .item {
              margin: 8px 0;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .item-notes {
              font-size: 10px;
              font-style: italic;
              margin-left: 10px;
              color: #666;
            }
            .total {
              font-size: 14px;
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">${restaurantName}</div>
            <div>${type === 'kitchen' ? 'PEDIDO - COZINHA' : 'RECIBO DE PEDIDO'}</div>
          </div>

          <div class="section">
            <div class="row">
              <span>Pedido:</span>
              <strong>${order.order_number}</strong>
            </div>
            <div class="row">
              <span>Data:</span>
              <span>${new Date(order.created_at).toLocaleString('pt-BR')}</span>
            </div>
            ${tableNumber ? `
              <div class="row">
                <span>Mesa:</span>
                <strong>${tableNumber}</strong>
              </div>
            ` : ''}
            ${order.delivery_type === 'dine_in' ? '<div class="row"><span>Tipo:</span><span>Consumo no Local</span></div>' : ''}
            ${order.delivery_type === 'delivery' ? '<div class="row"><span>Tipo:</span><span>Entrega</span></div>' : ''}
            ${order.delivery_type === 'pickup' ? '<div class="row"><span>Tipo:</span><span>Retirada</span></div>' : ''}
          </div>

          ${order.customer_name || order.customer_phone ? `
            <div class="section">
              ${order.customer_name ? `<div class="row"><span>Cliente:</span><span>${order.customer_name}</span></div>` : ''}
              ${order.customer_phone ? `<div class="row"><span>Telefone:</span><span>${order.customer_phone}</span></div>` : ''}
            </div>
          ` : ''}

          <div class="items">
            <div style="font-weight: bold; margin-bottom: 5px;">ITENS DO PEDIDO:</div>
            ${order.order_items.map(item => `
              <div class="item">
                <div class="item-header">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>R$ ${item.total_price.toFixed(2)}</span>
                </div>
                ${item.notes ? `<div class="item-notes">Obs: ${item.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>

          ${type === 'customer' ? `
            <div class="section">
              <div class="row">
                <span>Subtotal:</span>
                <span>R$ ${order.subtotal.toFixed(2)}</span>
              </div>
              <div class="total">
                Total: R$ ${order.total.toFixed(2)}
              </div>
              <div class="row" style="margin-top: 5px;">
                <span>Pagamento:</span>
                <span>${
                  order.payment_method === 'cash' ? 'Dinheiro' :
                  order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                  order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                  order.payment_method === 'pix' ? 'PIX' : order.payment_method
                }</span>
              </div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="section">
              <div style="font-weight: bold;">Observações:</div>
              <div>${order.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>Obrigado pela preferência!</div>
            ${type === 'kitchen' ? '<div style="margin-top: 10px;">_______________________________</div><div>Assinatura do Responsável</div>' : ''}
          </div>
        </body>
      </html>
    `;

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

export const generatePrintReceipt = (order: Order, restaurantName: string, tableNumber?: number, type: 'kitchen' | 'customer' = 'customer') => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    document.body.removeChild(div);
    return;
  }

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido ${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .section {
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .items {
            margin: 10px 0;
          }
          .item {
            margin: 8px 0;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .item-notes {
            font-size: 10px;
            font-style: italic;
            margin-left: 10px;
            color: #666;
          }
          .total {
            font-size: 14px;
            font-weight: bold;
            text-align: right;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">${restaurantName}</div>
          <div>${type === 'kitchen' ? 'PEDIDO - COZINHA' : 'RECIBO DE PEDIDO'}</div>
        </div>

        <div class="section">
          <div class="row">
            <span>Pedido:</span>
            <strong>${order.order_number}</strong>
          </div>
          <div class="row">
            <span>Data:</span>
            <span>${new Date(order.created_at).toLocaleString('pt-BR')}</span>
          </div>
          ${tableNumber ? `
            <div class="row">
              <span>Mesa:</span>
              <strong>${tableNumber}</strong>
            </div>
          ` : ''}
          ${order.delivery_type === 'dine_in' ? '<div class="row"><span>Tipo:</span><span>Consumo no Local</span></div>' : ''}
          ${order.delivery_type === 'delivery' ? '<div class="row"><span>Tipo:</span><span>Entrega</span></div>' : ''}
          ${order.delivery_type === 'pickup' ? '<div class="row"><span>Tipo:</span><span>Retirada</span></div>' : ''}
        </div>

        ${order.customer_name || order.customer_phone ? `
          <div class="section">
            ${order.customer_name ? `<div class="row"><span>Cliente:</span><span>${order.customer_name}</span></div>` : ''}
            ${order.customer_phone ? `<div class="row"><span>Telefone:</span><span>${order.customer_phone}</span></div>` : ''}
          </div>
        ` : ''}

        <div class="items">
          <div style="font-weight: bold; margin-bottom: 5px;">ITENS DO PEDIDO:</div>
          ${order.order_items.map(item => `
            <div class="item">
              <div class="item-header">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${item.total_price.toFixed(2)}</span>
              </div>
              ${item.notes ? `<div class="item-notes">Obs: ${item.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>

        ${type === 'customer' ? `
          <div class="section">
            <div class="row">
              <span>Subtotal:</span>
              <span>R$ ${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="total">
              Total: R$ ${order.total.toFixed(2)}
            </div>
            <div class="row" style="margin-top: 5px;">
              <span>Pagamento:</span>
              <span>${
                order.payment_method === 'cash' ? 'Dinheiro' :
                order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                order.payment_method === 'pix' ? 'PIX' : order.payment_method
              }</span>
            </div>
          </div>
        ` : ''}

        ${order.notes ? `
          <div class="section">
            <div style="font-weight: bold;">Observações:</div>
            <div>${order.notes}</div>
          </div>
        ` : ''}

        <div class="footer">
          <div>Obrigado pela preferência!</div>
          ${type === 'kitchen' ? '<div style="margin-top: 10px;">_______________________________</div><div>Assinatura do Responsável</div>' : ''}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
    document.body.removeChild(div);
  }, 250);
};
