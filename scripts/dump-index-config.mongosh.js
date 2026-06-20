const ids = [];
for (let i = 0; i < 20; i++) {
  ids.push("ui.index." + i + ".label");
  ids.push("ui.index." + i + ".parameter");
  ids.push("ui.index." + i + ".type");
  ids.push("ui.index." + i + ".components");
}
const rows = db.config.find({ _id: { $in: ids } }).toArray();
print("INDEX_COLS=" + rows.filter(r => r._id.endsWith(".label")).length);
for (const r of rows.sort((a, b) => a._id.localeCompare(b._id))) {
  if (r._id.endsWith(".label") || r._id.endsWith(".parameter")) {
    print(r._id + "=" + JSON.stringify(r.value));
  }
}
