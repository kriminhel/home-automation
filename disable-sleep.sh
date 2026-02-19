#!/bin/bash
# ============================================
# Désactiver la mise en veille sur le serveur domotique Ubuntu
# Usage: sudo bash disable-sleep.sh
# ============================================

set -e

echo "🔧 Désactivation de la mise en veille automatique..."

# Vérifier qu'on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté avec sudo"
    echo "   Usage: sudo bash disable-sleep.sh"
    exit 1
fi

# 1. Désactiver les targets de veille systemd
echo "  → Désactivation des targets suspend/hibernate..."
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# 2. Configurer logind pour ne jamais mettre en veille
echo "  → Configuration de logind (IdleAction=ignore)..."
mkdir -p /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/no-suspend.conf << 'EOF'
[Login]
# Désactiver la mise en veille automatique (serveur domotique)
IdleAction=ignore
IdleActionSec=0
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
EOF

# 3. Redémarrer logind pour appliquer
echo "  → Redémarrage de systemd-logind..."
systemctl restart systemd-logind

# 4. Désactiver la mise en veille GNOME/desktop (si installé)
if command -v gsettings &>/dev/null; then
    echo "  → Désactivation veille GNOME..."
    # Essayer pour tous les utilisateurs connectés
    for user_dir in /home/*/; do
        username=$(basename "$user_dir")
        if id "$username" &>/dev/null; then
            su - "$username" -c "
                export DBUS_SESSION_BUS_ADDRESS=\$(grep -z DBUS_SESSION_BUS_ADDRESS /proc/\$(pgrep -u \$USER gnome-session 2>/dev/null | head -1)/environ 2>/dev/null | tr '\0' '\n' | sed 's/DBUS_SESSION_BUS_ADDRESS=//')
                if [ -n \"\$DBUS_SESSION_BUS_ADDRESS\" ]; then
                    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing' 2>/dev/null
                    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing' 2>/dev/null
                fi
            " 2>/dev/null || true
        fi
    done
fi

echo ""
echo "✅ Mise en veille désactivée !"
echo ""
echo "Vérification :"
systemctl status sleep.target suspend.target hibernate.target --no-pager 2>/dev/null | grep -E "Loaded:|Active:" || true
echo ""
echo "Le PC restera maintenant allumé en permanence."
echo "Pour réactiver la veille : sudo systemctl unmask sleep.target suspend.target hibernate.target"
