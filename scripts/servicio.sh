#!/usr/bin/env bash
#
# Deja el frontend corriendo como servicio de macOS (launchd), para que
# arranque solo al iniciar sesión y se relance si se cae.
#
#   ./scripts/servicio.sh instalar   crea y arranca el servicio
#   ./scripts/servicio.sh quitar     lo detiene y lo elimina
#   ./scripts/servicio.sh reiniciar  lo relanza (tras cambiar dependencias)
#   ./scripts/servicio.sh estado     dice si está vivo y dónde
#   ./scripts/servicio.sh logs       sigue el log en directo
#
# Corre `npm run dev`, así que conserva la recarga en caliente: los cambios
# en el código se ven al momento en http://localhost:5174.

set -euo pipefail

LABEL="com.arzival.datafront.web"
PROYECTO="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/datafront-web.log"
DOMINIO="gui/$(id -u)"
URL="http://localhost:5174"

# launchd no hereda el PATH de la terminal: hay que dárselo explícito.
NPM="$(command -v npm || true)"
if [[ -z "$NPM" ]]; then
  echo "No encuentro npm en el PATH." >&2
  exit 1
fi
BIN_DIR="$(dirname "$NPM")"

instalar() {
  if [[ ! -d "$PROYECTO/node_modules" ]]; then
    echo "Instalando dependencias…"
    (cd "$PROYECTO" && "$NPM" install)
  fi

  mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"

  cat > "$PLIST" <<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NPM</string>
        <string>run</string>
        <string>dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROYECTO</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$BIN_DIR:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <!-- Si falla al arrancar (puerto ocupado, por ejemplo), no reintentar
         en bucle frenético: esperar 10 s entre intentos. -->
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>$LOG</string>
    <key>StandardErrorPath</key>
    <string>$LOG</string>
</dict>
</plist>
XML

  plutil -lint "$PLIST" >/dev/null
  launchctl bootout "$DOMINIO/$LABEL" 2>/dev/null || true
  launchctl bootstrap "$DOMINIO" "$PLIST"

  echo "Servicio instalado. Esperando a que responda…"
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null "$URL"; then
      echo "Listo: $URL"
      return
    fi
    sleep 1
  done
  echo "El servicio arrancó pero $URL no responde todavía. Mira: $0 logs" >&2
  exit 1
}

quitar() {
  launchctl bootout "$DOMINIO/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Servicio eliminado. El frontend ya no arrancará solo."
}

reiniciar() {
  launchctl kickstart -k "$DOMINIO/$LABEL"
  echo "Reiniciado."
}

estado() {
  if ! launchctl print "$DOMINIO/$LABEL" >/dev/null 2>&1; then
    echo "No instalado. Instálalo con: $0 instalar"
    exit 1
  fi

  local pid
  pid="$(launchctl print "$DOMINIO/$LABEL" | awk '/^\tpid =/ {print $3}')"

  if [[ -n "$pid" ]] && curl -s -o /dev/null "$URL"; then
    echo "Corriendo (pid $pid) en $URL"
  else
    echo "Instalado pero sin responder. Revisa: $0 logs"
    exit 1
  fi
}

case "${1:-}" in
  instalar) instalar ;;
  quitar) quitar ;;
  reiniciar) reiniciar ;;
  estado) estado ;;
  logs) tail -f "$LOG" ;;
  *)
    sed -n '3,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
