@echo off
cd /d "%~dp0"
echo Membuka http://localhost:8080 ... (tutup jendela ini untuk berhenti)
start "" http://localhost:8080
python -m http.server 8080 || py -m http.server 8080
pause
