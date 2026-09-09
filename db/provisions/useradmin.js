// Set penggantian useradmin dan superadmin secara otomatis (ONT web login).
// Bukan login ACS — ini login web ONT (admin panel).
//
// Cara pakai (sama seperti ACS lama):
// 1. Edit nilai UserAdmin / UserPass / SuperAdmin / SuperPass di bawah
// 2. Naikkan CRED_MARK (1 → 2 → 3 ...) supaya semua ONT kena update
// 3. Save provision — ONT ikut berubah di inform berikutnya
//
// Parameter multi-vendor = VirtualParameters BillingHub
// (ZTE / Huawei / FiberHome / CU / CMCC / CT-COM)

// false = hanya siap di menu Provisions (belum push ke ONT)
// true  = aktif push ke semua ONT saat inform
const ENABLED = false;

const CRED_MARK = 1; // naikkan tiap ganti password
const stamp = Date.now(86400000) + CRED_MARK;

const UserAdmin = "admin";
const UserPass = "admin123";
const SuperAdmin = "admin";
const SuperPass = "admin123";

if (!ENABLED) return;

const brand = declare("DeviceID.Manufacturer", { value: Date.now(86400000) }).value[0];
if (brand === "MikroTik") return;

// ---- User Admin (akun user web ONT) ----
declare("InternetGatewayDevice.X_CU_Function.Web.UserName", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.UserName", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.UserName", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.1.UserName", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.DeviceInfo.X_FH_Account.X_FH_WebUserInfo.WebUsername", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.User.2.Username", { value: stamp }, { value: UserAdmin });
declare("InternetGatewayDevice.X_CU_Function.ServiceMgt.LocalUserName", { value: stamp }, { value: UserAdmin });

declare("InternetGatewayDevice.X_CU_Function.Web.UserPassword", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.UserPassword", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.UserPassword", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.1.Password", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.DeviceInfo.X_FH_Account.X_FH_WebUserInfo.WebPassword", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.User.2.Password", { value: stamp }, { value: UserPass });
declare("InternetGatewayDevice.X_CU_Function.ServiceMgt.LocalUserPassword", { value: stamp }, { value: UserPass });

// ---- Super Admin (akun superadmin web ONT) ----
declare("InternetGatewayDevice.X_CU_Function.Web.AdminName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.AdminName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.UserName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.X_Authentication.WebAccount.UserName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.User.1.Username", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Username", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Username", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.X_CU_Function.ServiceMgt.LocalAdminName", { value: stamp }, { value: SuperAdmin });
declare("InternetGatewayDevice.LANConfigSecurity.ConfigUserName", { value: stamp }, { value: SuperAdmin });

declare("InternetGatewayDevice.X_CU_Function.Web.AdminPassword", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.X_ZTE-COM_UserInterface.X_ZTE-COM_WebUserInfo.AdminPassword", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.UserInterface.X_HW_WebUserInfo.2.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.X_Authentication.WebAccount.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.User.1.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.DeviceInfo.X_CMCC_TeleComAccount.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.DeviceInfo.X_CT-COM_TeleComAccount.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.DeviceInfo.X_FH_Account.X_FH_WebUserInfo.WebSuperPassword", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.DeviceInfo.X_ZTE-COM_AdminAccount.Password", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.X_CU_Function.ServiceMgt.LocalAdminPassword", { value: stamp }, { value: SuperPass });
declare("InternetGatewayDevice.LANConfigSecurity.ConfigPassword", { value: stamp }, { value: SuperPass });

// Refresh VP di UI (Admin Web Summon)
declare("VirtualParameters.userAdmin", { value: stamp });
declare("VirtualParameters.userPassword", { value: stamp });
declare("VirtualParameters.superAdmin", { value: stamp });
declare("VirtualParameters.superPassword", { value: stamp });
