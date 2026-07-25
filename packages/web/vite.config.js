import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        base: mode === "android" ? "./" : "/",
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: "http://localhost:8787",
                    changeOrigin: true,
                    rewrite: function (path) { return path.replace(/^\/api/, ""); },
                },
            },
        },
    });
});
