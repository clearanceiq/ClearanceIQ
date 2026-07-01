#!/bin/bash
# Hetzner VPS bootstrap for ClearanceIQ infrastructure
# Prereqs: install sshpass on your Windows/macOS/Linux runner first, then create:
#   ~/.hetzner-vps.conf with:
#     VPS_IP=your.vps.ip
#     VPS_ROOT_PASSWORD=your-root-password
# This script runs once on first boot, then exits. It does NOT loop.
set -e

CONFIG_FILE="$HOME/.hetzner-vps.conf"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[SKIP] No VPS config found at $CONFIG_FILE"
  echo "Create it with:"
  echo "  VPS_IP=your.ip.address"
  echo "  VPS_ROOT_PASSWORD=your-root-password"
  exit 0
fi

source "$CONFIG_FILE"

echo "=== Connecting to VPS at $VPS_IP ==="
sshpass -p "$VPS_ROOT_PASSWORD" ssh -o StrictHostKeyChecking=no root@$VPS_IP 'bash -s' << INNER_EOF
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
