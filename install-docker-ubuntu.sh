#!/bin/bash

# ============================================
# INSTALLATION DOCKER - Ubuntu Server 22.04
# ============================================

set -e

echo "============================================"
echo "  Installation Docker sur Ubuntu Server"
echo "============================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}⚠️  Ne pas lancer ce script en root !${NC}"
    echo "Lancez avec : bash install-docker-ubuntu.sh"
    exit 1
fi

echo -e "${YELLOW}1. Suppression des anciennes versions de Docker...${NC}"
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
echo -e "${GREEN}✓ Anciennes versions supprimées${NC}"
echo ""

echo -e "${YELLOW}2. Installation des dépendances...${NC}"
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
echo -e "${GREEN}✓ Dépendances installées${NC}"
echo ""

echo -e "${YELLOW}3. Ajout de la clé GPG Docker...${NC}"
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo -e "${GREEN}✓ Clé GPG ajoutée${NC}"
echo ""

echo -e "${YELLOW}4. Ajout du repository Docker...${NC}"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
echo -e "${GREEN}✓ Repository ajouté${NC}"
echo ""

echo -e "${YELLOW}5. Installation de Docker Engine...${NC}"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo -e "${GREEN}✓ Docker Engine installé${NC}"
echo ""

echo -e "${YELLOW}6. Ajout de l'utilisateur au groupe docker...${NC}"
sudo usermod -aG docker $USER
echo -e "${GREEN}✓ Utilisateur ajouté au groupe docker${NC}"
echo ""

echo -e "${YELLOW}7. Activation du démarrage automatique...${NC}"
sudo systemctl enable docker
sudo systemctl start docker
echo -e "${GREEN}✓ Docker démarré et activé au boot${NC}"
echo ""

echo -e "${YELLOW}8. Vérification de l'installation...${NC}"
sudo docker --version
sudo docker compose version
echo ""

echo "============================================"
echo -e "${GREEN}✓ Installation Docker terminée !${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT : Vous devez vous déconnecter/reconnecter${NC}"
echo "   pour que les changements de groupe prennent effet."
echo ""
echo "Commandes :"
echo "   exit"
echo "   ssh homeassistant@[IP]"
echo ""
echo "Puis testez :"
echo "   docker --version"
echo "   docker compose version"
echo ""
