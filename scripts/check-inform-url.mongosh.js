const s = db.provisions.findOne({ _id: "inform" }).script;
print("ACS URL:", (s.match(/http:\/\/[^\s"']+/) || [])[0]);
print("TR-069 user set:", /AcsUser\s*=/.test(s) || /__ACS_USER__/.test(s) ? "present" : "check failed");
print("TR-069 pass set:", /AcsPass\s*=/.test(s) || /__ACS_PASS__/.test(s) ? "present" : "check failed");
