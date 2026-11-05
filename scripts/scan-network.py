#!/usr/bin/env python3
"""
Scan du réseau local pour inventorier les équipements pilotables par Home Assistant.

À lancer sur un PC / Mac / Raspberry Pi connecté au MÊME réseau que les équipements
(pas depuis un VPN ni un réseau invité) :

    python3 scripts/scan-network.py                 # détecte le sous-réseau automatiquement
    python3 scripts/scan-network.py 192.168.1.0/24  # ou le préciser

Aucune dépendance : Python 3.8+ standard uniquement. Lecture seule : le script ne fait
qu'écouter et interroger (SSDP, mDNS, Broadlink, Tuya, ports TCP), il ne modifie rien.

Résultat : docs/scan-report.md (à committer / partager pour compléter le PRD).
"""
import ipaddress
import os
import platform
import re
import socket
import struct
import subprocess
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

TIMEOUT_TCP = 0.4

# port -> (indice, intégration Home Assistant suggérée)
PORT_HINTS = {
    80: ("Interface web (IPX800, box, caméra…)", ""),
    554: ("Flux RTSP (caméra)", "onvif / generic"),
    1400: ("Sonos", "sonos"),
    1883: ("Broker MQTT", "mqtt"),
    1925: ("TV Philips (JointSpace)", "philips_js"),
    3000: ("TV LG webOS", "webostv"),
    3001: ("TV LG webOS (TLS)", "webostv"),
    5000: ("NAS Synology / service web", "synology_dsm"),
    6466: ("Android TV / Google TV (télécommande)", "androidtv_remote"),
    6668: ("Appareil Tuya / Smart Life (Loratap…)", "tuya / localtuya"),
    7000: ("AirPlay (Apple TV, HomePod, TV compatible)", "apple_tv"),
    8001: ("TV Samsung Tizen", "samsungtv"),
    8002: ("TV Samsung Tizen (TLS)", "samsungtv"),
    8008: ("Google Cast (Chromecast, Nest, TV)", "cast"),
    8009: ("Google Cast", "cast"),
    8060: ("Roku", "roku"),
    8080: ("Service web alternatif", ""),
    8123: ("Home Assistant", ""),
    9000: ("Service web / Freebox", ""),
    10001: ("TV Sony Bravia (IRCC)", "braviatv"),
    55443: ("Ampoule Yeelight", "yeelight"),
}

MDNS_SERVICES = {
    "_googlecast._tcp.local": ("Google Cast", "cast"),
    "_airplay._tcp.local": ("AirPlay", "apple_tv"),
    "_raop._tcp.local": ("AirPlay audio", "apple_tv"),
    "_companion-link._tcp.local": ("Apple TV / appareil Apple", "apple_tv"),
    "_hap._tcp.local": ("Accessoire HomeKit", "homekit_controller"),
    "_hue._tcp.local": ("Pont Philips Hue", "hue"),
    "_sonos._tcp.local": ("Sonos", "sonos"),
    "_spotify-connect._tcp.local": ("Enceinte Spotify Connect", ""),
    "_androidtvremote2._tcp.local": ("Android TV / Google TV", "androidtv_remote"),
    "_fbx-api._tcp.local": ("Freebox", "freebox"),
    "_home-assistant._tcp.local": ("Home Assistant", ""),
    "_esphomelib._tcp.local": ("ESPHome", "esphome"),
    "_shelly._tcp.local": ("Shelly", "shelly"),
    "_elg._tcp.local": ("Elgato", "elgato"),
    "_ipp._tcp.local": ("Imprimante", "ipp"),
    "_printer._tcp.local": ("Imprimante", "ipp"),
    "_miio._udp.local": ("Xiaomi (aspirateur, purificateur…)", "xiaomi_miio"),
    "_nanoleafapi._tcp.local": ("Nanoleaf", "nanoleaf"),
    "_wled._tcp.local": ("WLED", "wled"),
    "_amzn-wplay._tcp.local": ("Amazon Fire TV / Echo", "androidtv"),
    "_daap._tcp.local": ("Partage iTunes / Apple", ""),
    "_smb._tcp.local": ("Partage fichiers / NAS", ""),
}

BROADLINK_TYPES = {
    0x2737: "RM mini 3 (IR seul)", 0x27C2: "RM mini 3", 0x5F36: "RM mini 3",
    0x6539: "RM4C mini (IR seul)", 0x6507: "RM4 mini (IR seul)", 0x51DA: "RM4 mini (IR seul)",
    0x520B: "RM4 Pro (IR + RF 433)", 0x5213: "RM4 Pro (IR + RF 433)", 0x6026: "RM4 Pro (IR + RF 433)",
    0x61A2: "RM4 Pro (IR + RF 433)", 0x649B: "RM4 Pro (IR + RF 433)", 0x653C: "RM4 Pro (IR + RF 433)",
    0x2712: "RM2 / RM Pro", 0x272A: "RM2 Pro Plus (IR + RF)", 0x2787: "RM2 Pro Plus (IR + RF)",
}

results = {}  # ip -> {"names": set, "hints": list[(source, desc, integration)], "mac": str}
lock = threading.Lock()


def add(ip, source, desc, integration="", name=None):
    with lock:
        entry = results.setdefault(ip, {"names": set(), "hints": [], "mac": ""})
        hint = (source, desc, integration)
        if hint not in entry["hints"]:
            entry["hints"].append(hint)
        if name:
            entry["names"].add(name.strip())


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


# ---------------------------------------------------------------- SSDP / UPnP
def scan_ssdp(duration=4):
    msg = ("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n"
           'MAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n').encode()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    sock.settimeout(0.5)
    locations = {}
    for _ in range(2):
        sock.sendto(msg, ("239.255.255.250", 1900))
    end = time.time() + duration
    while time.time() < end:
        try:
            data, (ip, _) = sock.recvfrom(65507)
        except socket.timeout:
            continue
        except OSError:
            break
        text = data.decode(errors="ignore")
        server = re.search(r"(?im)^server:\s*(.+)$", text)
        loc = re.search(r"(?im)^location:\s*(\S+)", text)
        if server:
            add(ip, "SSDP", server.group(1).strip())
        if loc:
            locations.setdefault(ip, set()).add(loc.group(1).strip())
    sock.close()

    def fetch(ip, url):
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                xml = r.read(200000).decode(errors="ignore")
        except Exception:
            return
        get = lambda tag: (re.search(rf"<{tag}>([^<]*)</{tag}>", xml) or [None, ""])[1].strip()
        name, maker, model = get("friendlyName"), get("manufacturer"), get("modelName")
        if name or maker or model:
            add(ip, "UPnP", f"{maker} {model}".strip(), "", name or None)

    with ThreadPoolExecutor(16) as ex:
        for ip, locs in locations.items():
            for url in list(locs)[:3]:
                ex.submit(fetch, ip, url)


# ---------------------------------------------------------------- mDNS
def _dns_query(name, qtype=12):
    header = struct.pack(">HHHHHH", 0, 0, 1, 0, 0, 0)
    q = b"".join(bytes([len(p)]) + p.encode() for p in name.split(".")) + b"\x00"
    return header + q + struct.pack(">HH", qtype, 1)


def _encoded(name):
    return b"".join(bytes([len(p)]) + p.encode() for p in name.split(".") if p)


def scan_mdns(duration=5):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 255)
    sock.settimeout(0.5)
    for svc in list(MDNS_SERVICES) + ["_services._dns-sd._udp.local"]:
        try:
            sock.sendto(_dns_query(svc), ("224.0.0.251", 5353))
        except OSError:
            pass
    end = time.time() + duration
    while time.time() < end:
        try:
            data, (ip, _) = sock.recvfrom(9000)
        except socket.timeout:
            continue
        except OSError:
            break
        for svc, (desc, integ) in MDNS_SERVICES.items():
            enc = _encoded(svc)
            pos = data.find(enc)
            if pos > 0:
                # nom d'instance : label qui précède le type de service (si non compressé)
                name = None
                m = re.findall(rb"([\x01-\x3f])([^\x00-\x1f]{1,63})" + re.escape(enc), data)
                if m:
                    name = m[0][1].decode(errors="ignore")
                add(ip, "mDNS", desc, integ, name)
    sock.close()


# ---------------------------------------------------------------- Broadlink
def scan_broadlink(my_ip, duration=3):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.bind(("", 0))
    sock.settimeout(0.5)
    port = sock.getsockname()[1]
    p = bytearray(0x30)
    now = datetime.now()
    tz = int(-time.timezone / 3600)
    p[0x08:0x0C] = struct.pack("<i", tz)
    p[0x0C:0x0E] = struct.pack("<H", now.year)
    p[0x0E], p[0x0F], p[0x10] = now.minute, now.hour, now.year % 100
    p[0x11], p[0x12], p[0x13] = now.isoweekday(), now.day, now.month
    p[0x18:0x1C] = socket.inet_aton(my_ip)[::-1]
    p[0x1C:0x1E] = struct.pack("<H", port)
    p[0x26] = 6
    checksum = (0xBEAF + sum(p)) & 0xFFFF
    p[0x20:0x22] = struct.pack("<H", checksum)
    try:
        sock.sendto(p, ("255.255.255.255", 80))
    except OSError:
        sock.close()
        return
    end = time.time() + duration
    while time.time() < end:
        try:
            data, (ip, _) = sock.recvfrom(1024)
        except socket.timeout:
            continue
        if len(data) < 0x40:
            continue
        devtype = data[0x34] | data[0x35] << 8
        mac = ":".join(f"{b:02x}" for b in data[0x3F:0x39:-1])
        name = data[0x40:].split(b"\x00")[0].decode(errors="ignore") or None
        model = BROADLINK_TYPES.get(devtype, f"type 0x{devtype:04X}")
        add(ip, "Broadlink", f"Broadlink {model} (MAC {mac})", "broadlink", name)
    sock.close()


# ---------------------------------------------------------------- Tuya (broadcast)
def scan_tuya(duration=7):
    def listen(port):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("", port))
        except OSError:
            return
        sock.settimeout(0.5)
        end = time.time() + duration
        while time.time() < end:
            try:
                _, (ip, _) = sock.recvfrom(4096)
                add(ip, "Tuya", f"Appareil Tuya / Smart Life (annonce UDP {port})", "tuya / localtuya")
            except socket.timeout:
                continue
        sock.close()

    threads = [threading.Thread(target=listen, args=(p,)) for p in (6666, 6667)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


# ---------------------------------------------------------------- Ports TCP
def scan_ports(network):
    hosts = [str(h) for h in network.hosts()]

    def probe(ip, port):
        try:
            with socket.create_connection((ip, port), timeout=TIMEOUT_TCP):
                desc, integ = PORT_HINTS[port]
                add(ip, f"TCP {port}", desc, integ)
        except OSError:
            pass

    with ThreadPoolExecutor(256) as ex:
        for ip in hosts:
            for port in PORT_HINTS:
                ex.submit(probe, ip, port)

    # Identification de l'IPX800 / pages web
    def title(ip):
        try:
            with urllib.request.urlopen(f"http://{ip}/", timeout=2) as r:
                html = r.read(20000).decode(errors="ignore")
        except Exception as e:
            html = str(getattr(e, "headers", "") or "")
        if re.search(r"ipx800|gce", html, re.I):
            add(ip, "HTTP", "GCE IPX800", "rest_command (déjà en place)")
        t = re.search(r"<title>([^<]{1,80})</title>", html, re.I)
        if t:
            add(ip, "HTTP", f"Page web « {t.group(1).strip()} »")

    web = [ip for ip, e in results.items() if any(h[0] == "TCP 80" for h in e["hints"])]
    with ThreadPoolExecutor(32) as ex:
        ex.map(title, web)


# ---------------------------------------------------------------- ARP / noms
def enrich():
    try:
        cmd = ["arp", "-a"] if platform.system() != "Linux" else ["ip", "neigh"]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=10).stdout
    except Exception:
        out = ""
    for line in out.splitlines():
        ip = re.search(r"(\d+\.\d+\.\d+\.\d+)", line)
        mac = re.search(r"([0-9a-fA-F]{1,2}[:-]){5}[0-9a-fA-F]{1,2}", line)
        if ip and mac and ip.group(1) in results:
            results[ip.group(1)]["mac"] = mac.group(0).lower().replace("-", ":")
    for ip, e in results.items():
        try:
            e["names"].add(socket.gethostbyaddr(ip)[0])
        except Exception:
            pass


def guess_category(hints):
    text = " ".join(h[1] for h in hints).lower()
    rules = [
        ("🎛️ Broadlink", "broadlink"), ("💡 Lumières (IPX800)", "ipx800"),
        ("📺 TV", "tv|tizen|webos|bravia|philips|roku|fire tv"),
        ("📡 Box / décodeur", "freebox|livebox|bbox|sfr box|décodeur"),
        ("🔊 Audio / cast", "sonos|cast|airplay|spotify|echo"),
        ("🔌 Tuya (volets, garage, prises…)", "tuya"), ("💡 Éclairage connecté", "hue|yeelight|nanoleaf|wled|shelly"),
        ("📷 Caméra", "rtsp|camera|caméra"), ("🖨️ Imprimante / NAS", "imprimante|nas|synology"),
        ("🏠 Home Assistant / MQTT", "home assistant|mqtt"),
    ]
    for cat, pattern in rules:
        if re.search(pattern, text):
            return cat
    return "❓ Autre"


def write_report(network, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rows = []
    for ip in sorted(results, key=lambda x: tuple(int(p) for p in x.split("."))):
        e = results[ip]
        integ = sorted({h[2] for h in e["hints"] if h[2]})
        rows.append((guess_category(e["hints"]), ip, e["mac"], ", ".join(sorted(e["names"])) or "—",
                     "<br>".join(f"`{h[0]}` {h[1]}" for h in e["hints"]), ", ".join(integ) or "—"))
    rows.sort(key=lambda r: (r[0], tuple(int(p) for p in r[1].split("."))))
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# Rapport de scan réseau\n\n- **Date** : {datetime.now():%Y-%m-%d %H:%M}\n"
                f"- **Réseau** : `{network}`\n- **Appareils détectés** : {len(rows)}\n\n")
        f.write("| Catégorie | IP | MAC | Nom | Indices | Intégration HA suggérée | Niveau / pièce |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for r in rows:
            f.write("| " + " | ".join(r) + " | ⚠️ |\n")
        f.write("\n> Compléter la colonne *Niveau / pièce*, puis reporter dans `docs/PRD.md` §4.\n"
                "> Les appareils uniquement infrarouges (vieille TV, clim, ampli) et les volets RF\n"
                "> n'apparaissent PAS sur le réseau : les ajouter à la main (pilotage via Broadlink).\n")


def main():
    my_ip = local_ip()
    if len(sys.argv) > 1:
        network = ipaddress.ip_network(sys.argv[1], strict=False)
    else:
        network = ipaddress.ip_network(f"{my_ip}/24", strict=False)
    if network.num_addresses > 1024:
        sys.exit("Réseau trop grand : précise un /24 (ex. 192.168.1.0/24).")
    print(f"→ IP locale {my_ip}, scan de {network}")

    steps = [("SSDP/UPnP", lambda: scan_ssdp()), ("mDNS/Bonjour", lambda: scan_mdns()),
             ("Broadlink", lambda: scan_broadlink(my_ip)), ("Tuya", lambda: scan_tuya())]
    threads = []
    for label, fn in steps:
        print(f"  • {label}…")
        t = threading.Thread(target=fn)
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    print("  • Ports TCP (≈ 30 s)…")
    scan_ports(network)
    enrich()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "docs", "scan-report.md")
    write_report(network, path)
    print(f"\n✅ {len(results)} appareils détectés → {path}")
    for ip, e in sorted(results.items(), key=lambda kv: tuple(int(p) for p in kv[0].split("."))):
        print(f"  {ip:15} {guess_category(e['hints']):32} {', '.join(sorted(e['names']))[:40]}")


if __name__ == "__main__":
    main()
