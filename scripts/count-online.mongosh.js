const now = Date.now();
const online = db.devices.countDocuments({ _lastInform: { $gt: new Date(now - 600000) } });
const offline24 = db.devices.countDocuments({ _lastInform: { $lt: new Date(now - 86400000) } });
const total = db.devices.countDocuments();
print("total=" + total);
print("online_10m=" + online);
print("offline_24h=" + offline24);
