db.config.updateOne(
  { _id: "ui.overview.groups.1_status.label" },
  { $set: { value: "''" } }
);
db.cache.deleteOne({ _id: "ui-local-cache-hash" });
print("OK: overview group label cleared");
