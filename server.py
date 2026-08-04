# server.py
from flask import Flask, request, jsonify
import win32print
import config

app = Flask(__name__)

# Configuração de CORS para liberar requisições vindas do navegador Linux
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    return response

def send_raw_to_printer(printer_name: str, zpl_content: str) -> int:
    """
    Garante a quebra de linha correta e envia a string ZPL 
    convertida para bytes (latin-1) diretamente para a impressora.
    """
    # Garante que as quebras de linha estejam no padrão \r\n que a Zebra exige
    formatted_zpl = zpl_content.replace('\r\n', '\n').replace('\n', '\r\n')
    payload = formatted_zpl.encode('latin-1', errors='ignore')

    h_printer = win32print.OpenPrinter(printer_name)
    try:
        job_info = ("Zebra_Print_Job", None, "RAW")
        job_id = win32print.StartDocPrinter(h_printer, 1, job_info)
        win32print.StartPagePrinter(h_printer)
        
        bytes_written = win32print.WritePrinter(h_printer, payload)
        
        win32print.EndPagePrinter(h_printer)
        win32print.EndDocPrinter(h_printer)
        return bytes_written
    finally:
        win32print.ClosePrinter(h_printer)

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "printer": config.PRINTER_NAME
    })

@app.route("/print", methods=["POST", "OPTIONS"])
def print_label():
    if request.method == "OPTIONS":
        return "", 200

    try:
        # Decodifica os dados recebidos para string UTF-8 / Latin-1
        zpl_text = request.get_data(as_text=True)
        
        if not zpl_text or not zpl_text.strip():
            return jsonify({"status": "error", "message": "Nenhum dado ZPL enviado."}), 400

        # Envia para o spooler usando o tratamento de RAW validado
        bytes_sent = send_raw_to_printer(config.PRINTER_NAME, zpl_text)
        
        return jsonify({
            "status": "success", 
            "message": "Etiqueta impressa com sucesso!",
            "bytes": bytes_sent
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=True)