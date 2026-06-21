const s = db.provisions.findOne({ _id: "inform" }).script;
print("ACS URL:", (s.match(/http:\/\/[^\s"']+/) || [])[0]);
print("TR-069 user:", s.includes('"admin"') || s.includes("admin") ? "admin OK" : "check failed");
print("TR-069 pass:", s.includes("bilhub91") ? "bilhub91 OK" : "check failed");
