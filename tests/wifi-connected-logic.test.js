const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  adHasDataFilter,
  adAllEmptyFilter,
  hostWifiRowFilter,
  isWifiHostRow,
  resolveWifiClientHostName,
  resolveWifiClientIP,
  resolveWifiClientMac,
  analyzeWifiDisplay,
} = require("../lib/wifi-connected-logic");

describe("filter builders (short — max 8 slots)", () => {
  it("adHasDataFilter checks IP and MAC, reasonable length", () => {
    const f = adHasDataFilter(1);
    assert.ok(f.includes("AssociatedDeviceIPAddress IS NOT NULL"));
    assert.ok(f.includes("AssociatedDeviceMACAddress IS NOT NULL"));
    assert.ok(f.length < 2000, "filter must stay under GenieACS parser limit");
  });

  it("adAllEmptyFilter requires TotalAssociations > 0", () => {
    const f = adAllEmptyFilter(1);
    assert.ok(f.includes("TotalAssociations > 0"));
    assert.ok(f.includes("AssociatedDeviceMACAddress IS NULL"));
    assert.ok(f.length < 2500);
  });

  it("hostWifiRowFilter excludes guest 10.x", () => {
    const f = hostWifiRowFilter();
    assert.ok(f.includes("802.11"));
    assert.ok(f.includes("10.%"));
  });
});

describe("isWifiHostRow", () => {
  it("accepts 802.11", () => {
    assert.equal(isWifiHostRow({ type: "802.11", ip: "192.168.1.2" }), true);
  });
  it("accepts null type on 192.168.x", () => {
    assert.equal(isWifiHostRow({ type: "", ip: "192.168.1.5" }), true);
  });
  it("rejects guest 10.x without type", () => {
    assert.equal(isWifiHostRow({ type: "", ip: "10.10.102.43" }), false);
  });
});

describe("resolveWifiClient* (AD + LAN HOST lookup)", () => {
  const hosts = [
    { ip: "192.168.1.3", mac: "8A:6F:DC:F8:03:9D", name: "OPPO-A95" },
    { ip: "192.168.1.4", mac: "E6:B4:D4:E0:75:9D", name: "" },
  ];

  it("resolves hostname from LAN HOST by IP", () => {
    const ad = { AssociatedDeviceIPAddress: { _value: "192.168.1.3" } };
    assert.equal(resolveWifiClientHostName(ad, hosts), "OPPO-A95");
  });

  it("resolves IP from LAN HOST by MAC", () => {
    const ad = { AssociatedDeviceMACAddress: { _value: "E6:B4:D4:E0:75:9D" } };
    assert.equal(resolveWifiClientIP(ad, hosts), "192.168.1.4");
  });

  it("resolves MAC from LAN HOST by IP", () => {
    const ad = { AssociatedDeviceIPAddress: { _value: "192.168.1.3" } };
    assert.equal(resolveWifiClientMac(ad, hosts), "8A:6F:DC:F8:03:9D");
  });
});

describe("analyzeWifiDisplay — real device scenarios", () => {
  it("AYUNDA: Connected=3, AD=1 — incomplete AD from ONT", () => {
    const device = {
      InternetGatewayDevice: {
        LANDevice: {
          1: {
            WLANConfiguration: {
              1: {
                SSID: { _value: "AYUNDA2" },
                TotalAssociations: { _value: 3 },
                AssociatedDevice: {
                  1: {
                    AssociatedDeviceIPAddress: { _value: "192.168.1.3" },
                    AssociatedDeviceMACAddress: { _value: "8A:6F:DC:F8:03:9D" },
                  },
                },
              },
            },
            Hosts: {
              Host: {
                4: { IPAddress: { _value: "192.168.1.5" }, MACAddress: { _value: "F6:31:56:02:7C:42" } },
                6: { IPAddress: { _value: "192.168.1.4" }, MACAddress: { _value: "E6:B4:D4:E0:75:9D" } },
                9: { IPAddress: { _value: "192.168.1.6" }, MACAddress: { _value: "26:E4:35:3A:ED:47" } },
                13: { IPAddress: { _value: "10.10.102.43" }, MACAddress: { _value: "F6:AC:B1:BE:53:1B" } },
                15: { IPAddress: { _value: "10.10.101.233" }, MACAddress: { _value: "A6:90:EC:F2:6B:BC" } },
              },
            },
          },
        },
      },
    };
    const a = analyzeWifiDisplay(device);
    assert.equal(a.totalAssociations, 3);
    assert.equal(a.adRowCount, 1);
    assert.equal(a.lanHostCount, 5);
    assert.equal(a.wifiHostCount, 3);
    assert.equal(a.showAdTable, true);
    assert.equal(a.isIncomplete, true);
    assert.ok(a.lanHostCount > a.totalAssociations);
  });

  it("ftyanita: Connected=3, AD=3 — list should match count", () => {
    const device = {
      InternetGatewayDevice: {
        LANDevice: {
          1: {
            WLANConfiguration: {
              1: {
                TotalAssociations: { _value: 3 },
                AssociatedDevice: {
                  1: { AssociatedDeviceIPAddress: { _value: "192.168.1.4" }, AssociatedDeviceMACAddress: { _value: "20:F7:7C:47:DE:FF" } },
                  2: { AssociatedDeviceIPAddress: { _value: "192.168.1.3" }, AssociatedDeviceMACAddress: { _value: "FA:C8:32:C4:D4:59" } },
                  3: { AssociatedDeviceIPAddress: { _value: "192.168.1.2" }, AssociatedDeviceMACAddress: { _value: "EA:CE:0D:82:5D:4B" } },
                },
              },
            },
            Hosts: { Host: { 14: { IPAddress: { _value: "10.10.102.134" } } } },
          },
        },
      },
    };
    const a = analyzeWifiDisplay(device);
    assert.equal(a.adRowCount, 3);
    assert.equal(a.totalAssociations, 3);
    assert.equal(a.isIncomplete, false);
  });

  it("DELON: Connected=4, AD=4 — list matches count", () => {
    const device = {
      InternetGatewayDevice: {
        LANDevice: {
          1: {
            WLANConfiguration: {
              1: {
                TotalAssociations: { _value: 4 },
                AssociatedDevice: {
                  3: { AssociatedDeviceIPAddress: { _value: "192.168.1.10" } },
                  4: { AssociatedDeviceIPAddress: { _value: "192.168.1.3" } },
                  21: { AssociatedDeviceIPAddress: { _value: "192.168.1.5" } },
                  25: { AssociatedDeviceIPAddress: { _value: "192.168.1.2" } },
                },
              },
            },
            Hosts: {
              Host: {
                4: { IPAddress: { _value: "192.168.1.2" }, InterfaceType: { _value: "802.11" } },
                7: { IPAddress: { _value: "192.168.1.21" }, InterfaceType: { _value: "802.11" } },
              },
            },
          },
        },
      },
    };
    const a = analyzeWifiDisplay(device);
    assert.equal(a.adRowCount, 4);
    assert.equal(a.totalAssociations, 4);
    assert.ok(a.lanHostCount < a.adRowCount + 5);
  });

  it("GM220: Connected=1, AD=0 — no AD list, info message only", () => {
    const device = {
      InternetGatewayDevice: {
        LANDevice: {
          1: {
            WLANConfiguration: {
              1: { TotalAssociations: { _value: 1 }, AssociatedDevice: {} },
            },
            Hosts: {
              Host: {
                19: {
                  IPAddress: { _value: "192.168.1.3" },
                  MACAddress: { _value: "56:92:62:17:63:84" },
                  HostName: { _value: "vivo-Y20s" },
                  InterfaceType: { _value: "802.11" },
                },
              },
            },
          },
        },
      },
    };
    const a = analyzeWifiDisplay(device);
    assert.equal(a.showAdTable, false);
    assert.equal(a.showHostPrimary, true);
    assert.equal(a.wifiHostCount, 1);
  });
});
