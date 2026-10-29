#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")/backend"
if [ ! -d venv ]; then
  echo "📦 Criando ambiente virtual..."
  python -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
echo "🚀 Iniciando servidor em http://localhost:5000"
python app.py
