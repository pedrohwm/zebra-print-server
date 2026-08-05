# 🖨️ Servidor de Impressão Zebra ZD410 (Flask + Win32 + ZPL Web Client)

Uma solução completa e leve de **Servidor de Impressão em Rede** para impressoras térmicas **Zebra (ZD410)** conectadas via USB em um computador Windows. Permite o envio direto de comandos **ZPL via HTTP POST** a partir de qualquer estação de trabalho (Linux, Windows, macOS ou dispositivos móveis).

## 📌 Índice
- [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Requisitos do Sistema](#-requisitos-do-sistema)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Inicialização Automática com o Windows](#-inicialização-automática-com-o-windows)
- [Documentação da API REST](#-documentação-da-api-rest)
- [Interface Web (`print-zebra.html`)](#-interface-web-print-zebrahtml)
- [Resolução de Problemas](#-resolução-de-problemas)
- [Autores e Créditos](#-autores-e-créditos)

## 🎯 Visão Geral e Arquitetura

Anteriormente, a impressão de etiquetas dependia do utilitário `lp` (CUPS) instalado localmente nas máquinas Linux. Esta nova arquitetura elimina a necessidade de configurar drivers individuais em cada estação.

O computador Windows atua como um **Servidor de Impressão centralizado na rede local**:

## ✨ Funcionalidades

- Envio Direto em Modo RAW: Utiliza a API nativa do Windows (win32print) para injetar os bytes ZPL diretamente no Spooler de impressão, ignorando renderizações de driver GDI.
- Tratamento de Codificação: Suporte nativo à conversão de caracteres com codificação latin-1 e normalização das quebras de linha (\\r\\n), garantindo a correta interpretação do código ZPL pela memória da impressora.
- Suporte a CORS (Cross-Origin Resource Sharing): Permite chamadas de origens externas a partir de interfaces Web em qualquer máquina da rede local.
- Interface Web Completa (print-zebra.html):
  - Gerador dinâmico de ZPL para texto simples, impressão em lote (múltiplas linhas) e sequências numéricas/códigos.
  - Preview em tempo real com dimensionamento ajustável (largura, altura, tipo e tamanho de fonte).
  - Envio direto para a impressora via HTTP com apenas 1 clique.
  - Exportação/Download do arquivo .zpl gerado.
  - Visualização e cópia dinâmica dos comandos curl e lp legados.
  - Armazenamento automático do endereço IP do servidor no localStorage.

## 📁 Estrutura do Projeto

ServidorZebra/
│
├── config.py              # Definição de portas, IP e nome da impressora no Windows
├── server.py              # Servidor HTTP Flask e lógica de comunicação win32print
├── start.bat              # Script de arranque para o Agendador de Tarefas do Windows
├── print-zebra.html       # Interface Web do cliente para geração e envio de etiquetas
└── logs/                  # Diretório para registos de eventos (expansão futura)

## 🛠️ Requisitos do Sistema
🖥️ No Servidor (Computador Windows)
- Sistema Operacional: Windows 10, Windows 11 ou Windows Server.
- Driver: Impressora Zebra ZD410 instalada com drivers de fabricante (ex: ZDesigner ZD410-203dpi ZPL).
- Linguagem: Python 3.8+ instalado.
- Dependências Python:
  - flask
  - pywin32

💻 Nas Estações Cliente (Linux / Windows / Mac)
- Qualquer navegador Web moderno (Chrome, Firefox, Edge, Safari) ou utilitário HTTP (como curl).

## 🚀 Instalação e Configuração
1. Clonar o Repositório e Instalar Dependências
  - No computador Windows que funcionará como servidor, abra o terminal (cmd ou PowerShell) e execute:
  - **git clone [https://github.com/SEU_USUARIO/zebra-print-server.git](https://github.com/SEU_USUARIO/zebra-print-server.git)**
  - **cd zebra-print-server**
  - **python -m pip install flask pywin32**

2. Configurar a Impressora em config.py
  - Verifique o nome exato da sua impressora no Windows executando:
  - **python -c "import win32print; print([p[2] for p in win32print.EnumPrinters(2)])"**
  - Atualize o arquivo config.py com o nome obtido:
  - Python
    - **config.py**
      PRINTER_NAME = "ZDesigner ZD410-203dpi ZPL"
      PORT = 5000
      HOST = "0.0.0.0"  # Permite conexões de outros computadores da rede

3. Iniciar o Servidor Manualmente (Modo Teste)
  - python server.py
  - Confirme o funcionamento acessando http://localhost:5000/ no navegador. A resposta esperada é:
    {
        "status": "online",
        "printer": "ZDesigner ZD410-203dpi ZPL"
    }

## ⚙️ Inicialização Automática com o Windows
Para que o servidor execute automaticamente em segundo plano quando o computador for ligado (mesmo antes do login):

Confirmar o script start.bat, garanta que o arquivo está na pasta do projeto com este conteúdo:

  @echo off
  cd /d C:\\ServidorZebra
  python server.py

Configurar no Agendador de Tarefas do Windows (Task Scheduler):
- Pressione Win + R, digite taskschd.msc e pressione Enter.
- No painel direito, clique em Criar Tarefa... (Create Task).
- Aba Geral:
  Nome: Servidor Impressora Zebra
  Marque: Executar estando o usuário conectado ou não.
  Marque: Executar com privilégios mais altos.
- Aba Disparadores:
  Clique em Novo... -> Selecione Ao iniciar.
- Aba Ações:
  Clique em Novo... -> Selecione Iniciar um programa.
  Programa/script: C:\\ServidorZebra\\start.bat
  Iniciar em: C:\\ServidorZebra
- Aba Condições:
  Desmarque Iniciar a tarefa apenas se o computador estiver ligado à energia elétrica.
  Salve a tarefa digitando a senha do administrador do Windows.

## 📡 Documentação da API REST
Verifica a disponibilidade do servidor de impressão.

Resposta de Sucesso (200 OK):
  {
    "status": "online",
    "printer": "ZDesigner ZD410-203dpi ZPL"
  }

Recebe o código ZPL em texto/bytes brutos e envia para a impressora.
- Headers: Content-Type: text/plain
- Body: Código ZPL formatado.

Exemplo de Requisição via curl:
- **curl -X POST [http://192.168.0.199:5000/print](http://192.168.0.199:5000/print) --data-binary "^XA^FO40,40^A0N,40,40^FDTESTE DA API^FS^XZ"**

Resposta de Sucesso (200 OK):
  {
    "status": "success",
    "message": "Etiqueta impressa com sucesso!",
    "bytes": 54
  }

Resposta de Erro (400 Bad Request / 500 Internal Error):

  {
    "status": "error",
    "message": "Descrição detalhada do erro."
  }

## 🖥️ Interface Web (print-zebra.html)
O arquivo print-zebra.html é uma aplicação Web independente (Single File App) que pode ser executada em qualquer navegador.

Principais Botões e Ações:
- 🖨️ IMPRIMIR NA ZEBRA (HTTP): Envia a etiqueta diretamente para o servidor Windows configurado no topo da página.
- 💾 BAIXAR ARQUIVO .ZPL: Baixa a etiqueta gerada em formato de arquivo de texto .zpl.
- 📋 COPIAR CURL (REDE): Copia para a área de transferência o comando curl configurado com o IP atual.
- 📋 COPIAR LP (LINUX LOCAL): Copia o comando legado do utilitário lp.
- 📄 COPIAR APENAS ZPL: Copia o código ZPL puro.

## 🔍 Resolução de Problemas
1. A requisição HTTP falha no Linux (Failed to connect ou Timeout)
  - Verifique se a porta 5000 está bloqueada pelo Firewall do Windows.
  - Para liberar a porta, execute no PowerShell do Windows (como Administrador):
    - **New-NetFirewallRule -DisplayName "Servidor Zebra Flask" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow**
2. O documento entra na fila de impressão do Windows, mas nada sai na Zebra
- Certifique-se de que o driver instalado no Windows é a versão oficial da Zebra (ZDesigner).
- Nas propriedades da impressora no Windows -> aba Avançado:
- Desmarque a opção "Ativar recursos de impressão avançados".
- No botão Processador de Impressão, confirme se está definido para RAW.

## 🚧 Roadmap
- [x] API REST
- [x] Impressão RAW
- [x] Cliente HTML
- [ ] Dashboard Web
- [ ] Histórico
- [ ] Logs
- [ ] Autenticação
- [ ] Múltiplas impressoras
- [ ] Docker

## 🧩 Tecnologias

| Tecnologia | Finalidade |
|------------|------------|
| Python | Backend |
| Flask | API REST |
| pywin32 | Comunicação RAW |
| HTML5 | Interface |
| JavaScript | Cliente |
| ZPL II | Linguagem Zebra |

## 🤝 Contribuições
Contribuições são bem-vindas.

Caso encontre algum problema, abra uma Issue ou envie um Pull Request.
