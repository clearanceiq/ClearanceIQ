#!/bin/bash
# Hetzner VPS bootstrap for ClearanceIQ infrastructure
# Prereqs: install sshpass on your runner first, then create:
#   ~/.hetzner-vps.conf with:
#     HETZNER_IP=your.vps.ip
#     HETZNER_PASSWORD=your-root-password
#     HETZNER_USER=root
# This script runs once on first boot, then exits. It does NOT loop.
set -e

CONFIG_FILE="$HOME/.hetzner-vps.conf"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[SKIP] No VPS config found at $CONFIG_FILE"
  echo "Create it with:"
  echo "  HETZNER_IP=your.ip.address"
  echo "  HETZNER_PASSWORD=your-root-password"
  echo "  HETZNER_USER=root"
  exit 0
fi

source "$CONFIG_FILE"

VPS_IP="${HETZNER_IP:-$HETZNER_SERVER_IP}"
VPS_ROOT_PASSWORD="${HETZNER_PASSWORD:-$HETZNER_ROOT_PASSWORD}"
VPS_USER="${HETZNER_USER:-root}"

if [ -z "$VPS_IP" ] || [ -z "$VPS_ROOT_PASSWORD" ]; then
  echo "[ERROR] HETZNER_IP or HETZNER_PASSWORD is empty in $CONFIG_FILE"
  exit 1
fi

echo "=== Connecting to VPS at $VPS_IP ==="
sshpass -p "$VPS_ROOT_PASSWORD" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" 'bash -s' << INNER_EOF
set -e
echo "=== Updating system ==="
apt-get update && apt-get upgrade -y
echo "=== Installing dependencies ==="
apt-get install -y curl git nano ufw
echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
echo "=== Installing Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh
echo "=== Pulling Llama 3 8B ==="
ollama pull llama3:8b
echo "=== Installing nginx ==="
apt-get install -y nginx
echo "=== Configuring firewall ==="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "=== Setup complete ==="
echo "Ollama: http://localhost:11434"
echo "Nginx: http://localhost"
echo "Public IP: $(curl -s ifconfig.me)"
INNER_EOF

echo "=== VPS setup finished ==="
