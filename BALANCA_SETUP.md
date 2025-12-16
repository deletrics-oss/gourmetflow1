# Configuração de Balança para o Sistema GourmetFlow

Este guia explica como configurar uma balança eletrônica para funcionar com o sistema GourmetFlow.

## 🔌 Conexão

O sistema se conecta via WebSocket em `ws://localhost:9999`. É necessário um aplicativo auxiliar que:
1. Lê os dados da porta serial/USB da balança
2. Expõe esses dados via WebSocket

## 📦 Balanças Compatíveis

O sistema é compatível com qualquer balança que possua saída serial (RS-232/USB):

### Toledo
- Prix 3, Prix 4, Prix 5, Prix 6
- 9094, 9098, Linea

### Filizola
- BP-15, CS-15
- Platina, MF

### Urano
- US POP, UDC-POP
- US 20/2, US 30/5

### Balmak
- ELP-10/25/30
- ELCO-15/30

### Elgin
- DP-15, DP-30
- SM-100

### Outras
- Qualquer balança com saída serial/USB e protocolo conhecido

## 🖥️ Aplicativo Auxiliar

Você precisa de um aplicativo auxiliar rodando no computador do caixa. Opções:

### Opção 1: App Node.js (Recomendado)

```javascript
// balanca-server.js
const WebSocket = require('ws');
const SerialPort = require('serialport');

const wss = new WebSocket.Server({ port: 9999 });
const port = new SerialPort({ path: 'COM3', baudRate: 9600 }); // Ajuste a porta

let weight = 0;

port.on('data', (data) => {
  // Parse do protocolo da sua balança
  // Exemplo para Toledo Prix:
  const str = data.toString();
  const match = str.match(/(\d+\.\d+)/);
  if (match) {
    weight = parseFloat(match[1]);
  }
});

wss.on('connection', (ws) => {
  console.log('Cliente conectado');
  
  // Enviar peso a cada 100ms
  const interval = setInterval(() => {
    ws.send(JSON.stringify({ weight }));
  }, 100);
  
  ws.on('close', () => {
    clearInterval(interval);
  });
});

console.log('Servidor WebSocket rodando em ws://localhost:9999');
```

### Opção 2: App Electron (Interface Gráfica)

Disponível em breve no repositório oficial.

## ⚙️ Configuração

### 1. Identifique a Porta COM

No Windows:
- Abra o Gerenciador de Dispositivos
- Procure em "Portas (COM e LPT)"
- Anote a porta da balança (ex: COM3)

No Linux:
- Use `ls /dev/tty*` para listar dispositivos
- Geralmente será `/dev/ttyUSB0` ou `/dev/ttyACM0`

### 2. Configure o Baudrate

Consulte o manual da balança. Valores comuns:
- 9600 (mais comum)
- 4800
- 19200

### 3. Teste a Conexão

1. Inicie o aplicativo auxiliar
2. No sistema GourmetFlow, vá para PDV ou Balcão
3. Adicione um produto com "Venda por Peso"
4. O indicador deve mostrar "🟢 Conectada"

## 🔧 Troubleshooting

### Balança não conecta

1. Verifique se o cabo está bem conectado
2. Confirme a porta COM correta
3. Verifique se o app auxiliar está rodando
4. Teste com outro software (ex: PuTTY)

### Peso não atualiza

1. Verifique o baudrate
2. Confirme o protocolo da balança
3. Verifique as configurações de paridade (geralmente None)

### Erro de permissão (Linux)

```bash
sudo usermod -a -G dialout $USER
# Reinicie o computador
```

### Porta COM bloqueada

Feche outros programas que possam estar usando a porta serial.

## 📋 Protocolos Comuns

### Toledo Prix
```
Formato: PPPPPP\r\n
Exemplo: 001250\r\n (1.250 kg)
```

### Filizola
```
Formato: SPPPPPU
S = Status, P = Peso, U = Unidade
```

### Urano
```
Formato: \x02PPPPPP\x03
STX + Peso + ETX
```

## 🛒 Uso no Sistema

1. Cadastre produtos com "Venda por Peso" ativado
2. Informe o "Preço por KG"
3. No PDV/Balcão, ao adicionar o produto:
   - O sistema abre o dialog de peso
   - Lê automaticamente da balança
   - Ou digite manualmente como fallback
4. O valor é calculado: peso × preço/kg

## 📞 Suporte

Para dúvidas sobre integração de balanças específicas, entre em contato pelo suporte do sistema.
