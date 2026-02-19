#!/bin/bash

# ============================================
# SCRIPT DE DÉMARRAGE - Home Automation
# ============================================

set -e

echo "🏠 Démarrage du système domotique..."
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé !"
    echo "   Installez Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé !"
    echo "   Installez Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker et Docker Compose détectés"
echo ""

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé !"
    echo "   Création depuis .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Fichier .env créé"
        echo ""
        echo "⚠️  IMPORTANT : Éditez le fichier .env avec vos paramètres !"
        echo "   nano .env"
        echo ""
        read -p "Appuyez sur Entrée quand c'est fait..."
    else
        echo "❌ .env.example non trouvé !"
        exit 1
    fi
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p homeassistant-config/{lovelace,custom_components}
mkdir -p mosquitto/{config,data,log}
mkdir -p nginx/ssl
echo "✅ Répertoires créés"
echo ""

# Vérifier que secrets.yaml existe
if [ ! -f homeassistant-config/secrets.yaml ]; then
    echo "⚠️  Création de secrets.yaml..."
    cat > homeassistant-config/secrets.yaml << 'EOF'
# Secrets - NE JAMAIS COMMITTER !
ipx800_user: admin
ipx800_password: changeme

mqtt_user: homeassistant
mqtt_password: changeme

tuya_username: votre@email.com
tuya_password: changeme
tuya_country_code: "33"
tuya_application_type: smart_life
EOF
    echo "✅ secrets.yaml créé"
    echo ""
    echo "⚠️  IMPORTANT : Éditez homeassistant-config/secrets.yaml !"
    echo "   nano homeassistant-config/secrets.yaml"
    echo ""
    read -p "Appuyez sur Entrée quand c'est fait..."
fi

# Démarrer les services
echo "🚀 Démarrage de Home Assistant..."
echo ""

docker-compose up -d homeassistant

echo ""
echo "⏳ Attente du démarrage (30 secondes)..."
sleep 30

# Vérifier que Home Assistant est démarré
if docker-compose ps | grep -q homeassistant.*Up; then
    echo "✅ Home Assistant démarré avec succès !"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Installation terminée !"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Accédez à Home Assistant :"
    echo "   http://$(hostname -I | awk '{print $1}'):8123"
    echo "   ou"
    echo "   http://localhost:8123"
    echo ""
    echo "📖 Guide complet : GUIDE_INSTALLATION.md"
    echo ""
    echo "💡 Prochaines étapes :"
    echo "   1. Ouvrir l'URL ci-dessus dans votre navigateur"
    echo "   2. Créer votre compte administrateur"
    echo "   3. Configurer l'intégration Tuya (pour Loratap)"
    echo "   4. Tester le contrôle des lumières et volets"
    echo ""
    echo "🔧 Commandes utiles :"
    echo "   docker-compose logs -f homeassistant   # Voir les logs"
    echo "   docker-compose restart homeassistant   # Redémarrer"
    echo "   docker-compose down                     # Tout arrêter"
    echo ""
else
    echo "❌ Erreur lors du démarrage !"
    echo ""
    echo "Vérifiez les logs :"
    echo "   docker-compose logs homeassistant"
    exit 1
fi
