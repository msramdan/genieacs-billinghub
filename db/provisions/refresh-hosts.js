// refresh-hosts — LAN Hosts (IP/MAC/HostName) for Host Name lookup + Wifi Connected fallback.
// Same phases and logic as the Hosts part of refresh-wlan before 2026-10-21, but in its OWN
// preset channel ("refresh-hosts"). Some ONTs (ZICG F663NV3a / M69X XPON) list phantom Host
// instances that answer 9005 to any read; GenieACS 1.2 then re-lists and re-reads them until
// too_many_rpcs. Isolated here, only this channel faults (GenieACS backs off its retries) —
// inform / default / useradmin / refresh-wlan keep running.
const update = Date.now(180000); // refresh attrs ~ every 3 minutes
const slow = Date.now(300000);
const phase = Math.floor(Date.now() / 120000) % 8;

declare("InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries", { value: 1 });

if (phase === 2 || phase === 3) {
  for (let i = 1; i <= 12; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".IPAddress", {
      path: update,
      value: update,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".MACAddress", {
      path: update,
      value: update,
    });
  }
} else if (phase === 4 || phase === 5) {
  for (let i = 1; i <= 12; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".HostName", {
      path: slow,
      value: slow,
    });
  }
}
