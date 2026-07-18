#!/usr/bin/env python3
"""
Configure MikroTik L2TP client → ACS VPS (Summon path).

Env:
  MT_HOST     default vpn.billinghub.id
  MT_PORT     default 10002
  MT_USER     default admin
  MT_PASS     (required)
  ACS_IP      public IP of ACS VPS (required) — connect-to
  L2TP_USER   PPP user on ACS
  L2TP_PASS   PPP password
  L2TP_PSK    IPsec PSK
  MODEM_SUBNETS  comma-separated, e.g. 10.10.10.0/24
  L2TP_NAME   default l2tp-acs
"""
import os
import sys

try:
    from librouteros import connect
except ImportError:
    print("Install: pip install librouteros", file=sys.stderr)
    sys.exit(1)

HOST = os.environ.get("MT_HOST", "vpn.billinghub.id")
PORT = int(os.environ.get("MT_PORT", "10002"))
USER = os.environ.get("MT_USER", "admin")
PASS = os.environ.get("MT_PASS", "")
ACS_IP = os.environ.get("ACS_IP", "")
L2TP_USER = os.environ.get("L2TP_USER", "acs-mt")
L2TP_PASS = os.environ.get("L2TP_PASS", "")
L2TP_PSK = os.environ.get("L2TP_PSK", "")
L2TP_NAME = os.environ.get("L2TP_NAME", "l2tp-acs")
MODEM_SUBNETS = os.environ.get("MODEM_SUBNETS", "10.10.10.0/24")

if not PASS or not ACS_IP or not L2TP_PASS or not L2TP_PSK:
    print("Set MT_PASS, ACS_IP, L2TP_PASS, L2TP_PSK", file=sys.stderr)
    sys.exit(1)

api = connect(host=HOST, username=USER, password=PASS, port=PORT)
print("Connected:", HOST, PORT)

# Remove existing same-name client if any
for row in list(api.path("interface", "l2tp-client")):
    if row.get("name") == L2TP_NAME:
        print("Remove existing", L2TP_NAME, row.get(".id"))
        api.path("interface", "l2tp-client").remove(row[".id"])

params = {
    "name": L2TP_NAME,
    "connect-to": ACS_IP,
    "user": L2TP_USER,
    "password": L2TP_PASS,
    "use-ipsec": "yes",
    "ipsec-secret": L2TP_PSK,
    "add-default-route": "no",
    "use-peer-dns": "no",
    "profile": "default-encryption",
    "keepalive-timeout": "60",
    "max-mtu": "1400",
    "max-mru": "1400",
    "disabled": "no",
    "comment": "BillingHub ACS Summon tunnel",
}
api.path("interface", "l2tp-client").add(**params)
print("OK added L2TP client", L2TP_NAME, "->", ACS_IP)

# Allow forward from L2TP to modem subnets (filter accept)
# Ensure IP firewall allows forwarding (default often accepts established)
for net in [s.strip() for s in MODEM_SUBNETS.split(",") if s.strip()]:
    exists = False
    for r in api.path("ip", "firewall", "filter"):
        if r.get("comment") == f"bh-acs-summon-{net}":
            exists = True
            break
    if not exists:
        try:
            # ROS 6 API: hyphenated keys
            api.path("ip", "firewall", "filter").add(
                **{
                    "chain": "forward",
                    "action": "accept",
                    "in-interface": L2TP_NAME,
                    "dst-address": net,
                    "comment": f"bh-acs-summon-{net}",
                }
            )
            print("OK firewall forward", L2TP_NAME, "->", net)
        except Exception as e:
            print("WARN firewall rule (cek manual Winbox filter forward):", e)

# Wait / check running
import time

time.sleep(5)
for row in api.path("interface", "l2tp-client"):
    if row.get("name") == L2TP_NAME:
        print(
            "Status:",
            "running=" + str(row.get("running")),
            "disabled=" + str(row.get("disabled")),
        )

print("Done. Dari ACS: ping IP modem di subnet", MODEM_SUBNETS)
