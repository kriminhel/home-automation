# ============================================
# SCRIPT D'INSTALLATION - Windows 10
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Installation Home Assistant - Windows 10  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Docker
Write-Host "1. Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✓ Docker détecté: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker n'est pas installé !" -ForegroundColor Red
    Write-Host "   Installez Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Vérifier docker-compose
Write-Host "2. Vérification de Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "   ✓ Docker Compose détecté: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker Compose n'est pas installé !" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Vérifier fichier .env
Write-Host "3. Vérification du fichier .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ Fichier .env trouvé" -ForegroundColor Green
} else {
    Write-Host "   ! Fichier .env non trouvé, création depuis .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "   ✓ Fichier .env créé" -ForegroundColor Green
        Write-Host ""
        Write-Host "   ⚠️  IMPORTANT : Éditez le fichier .env avec vos paramètres !" -ForegroundColor Red
        Write-Host "      notepad .env" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "   Appuyez sur Entrée quand vous avez configuré .env"
    } else {
        Write-Host "   ✗ .env.example non trouvé !" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Vérifier secrets.yaml
Write-Host "4. Vérification de secrets.yaml..." -ForegroundColor Yellow
if (Test-Path "homeassistant-config\secrets.yaml") {
    Write-Host "   ✓ secrets.yaml trouvé" -ForegroundColor Green

    # Vérifier si les valeurs par défaut sont encore présentes
    $secretsContent = Get-Content "homeassistant-config\secrets.yaml" -Raw
    if ($secretsContent -match "changeme|votre@email.com") {
        Write-Host "   ⚠️  Les valeurs par défaut sont encore présentes !" -ForegroundColor Yellow
        Write-Host "      Éditez homeassistant-config\secrets.yaml" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "   Appuyez sur Entrée quand c'est fait"
    }
} else {
    Write-Host "   ✗ secrets.yaml non trouvé !" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Créer les répertoires nécessaires
Write-Host "5. Création des répertoires..." -ForegroundColor Yellow
$directories = @(
    "homeassistant-config\lovelace",
    "homeassistant-config\custom_components",
    "mosquitto\config",
    "mosquitto\data",
    "mosquitto\log",
    "nginx\ssl"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "   ✓ Répertoires créés" -ForegroundColor Green

Write-Host ""

# Obtenir l'IP du PC
Write-Host "6. Détection de l'adresse IP..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress
Write-Host "   ✓ IP détectée: $ip" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Démarrage de Home Assistant..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Démarrer Home Assistant
Write-Host "Démarrage du container Home Assistant..." -ForegroundColor Yellow
docker-compose up -d homeassistant

Write-Host ""
Write-Host "Attente du démarrage (30 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""

# Vérifier le statut
$status = docker-compose ps homeassistant
if ($status -match "Up") {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  ✓ Installation réussie !" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Accédez à Home Assistant :" -ForegroundColor Cyan
    Write-Host "   http://$ip:8123" -ForegroundColor White
    Write-Host "   ou" -ForegroundColor White
    Write-Host "   http://localhost:8123" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Guide complet : GUIDE_INSTALLATION.md" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "   1. Ouvrir l'URL ci-dessus dans votre navigateur" -ForegroundColor White
    Write-Host "   2. Créer votre compte administrateur" -ForegroundColor White
    Write-Host "   3. Configurer l'intégration Tuya (pour Loratap)" -ForegroundColor White
    Write-Host "   4. Tester le contrôle des lumières et volets" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Commandes utiles :" -ForegroundColor Cyan
    Write-Host "   docker-compose logs -f homeassistant   # Voir les logs" -ForegroundColor White
    Write-Host "   docker-compose restart homeassistant   # Redémarrer" -ForegroundColor White
    Write-Host "   docker-compose down                     # Tout arrêter" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  ✗ Erreur lors du démarrage" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez les logs :" -ForegroundColor Yellow
    Write-Host "   docker-compose logs homeassistant" -ForegroundColor Cyan
}
