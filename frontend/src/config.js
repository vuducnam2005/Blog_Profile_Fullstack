// =========================================================================
// CẤU HÌNH ĐỊA CHỈ MÁY CHỦ (API BACKEND URL) TỰ ĐỘNG
// =========================================================================

let apiUrl = "http://localhost:5020";

if (typeof window !== "undefined") {
    const origin = window.location.origin;     // Ví dụ: https://xyz-5173.asse.devtunnels.ms
    const hostname = window.location.hostname; // Ví dụ: xyz-5173.asse.devtunnels.ms hoặc 192.168.1.5

    if (origin.includes(".devtunnels.ms") && origin.includes("-5173")) {
        // Trường hợp 1: Chạy qua Chia sẻ Online của VS Code (Dev Tunnels)
        // Kỹ thuật tự động đổi đuôi port -5173 của web thành port -5020 của C#
        apiUrl = origin.replace("-5173", "-5020");
    } else if (hostname === "ducnamdev.site" || hostname === "www.ducnamdev.site" || hostname.includes("vercel.app")) {
        // Môi trường Production: Gọi qua Subdomain API
        apiUrl = "https://api.ducnamdev.site";
    } else if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        // Trường hợp 2: Chạy qua mạng LAN (dùng điện thoại bắt chung WiFi)
        apiUrl = `http://${hostname}:5020`;
    } else {
        // Trường hợp 3: Thay vì gọi localhost:5020 vốn cần chạy backend phức tạp,
        // giờ nối thẳng lên Backend thật để dễ dàng test UI, CSS.
        apiUrl = "https://api.ducnamdev.site";
    }
}

export const API_BASE_URL = apiUrl;
