/* QR scanning from the phone camera.
   Uses the browser's built-in BarcodeDetector where it exists (Chrome on Android),
   otherwise jsQR, loaded once from a CDN (iPhone and others). */

export const JSQR_URL = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";

let jsqrP = null;
function loadJsQR() {
  if (typeof window !== "undefined" && window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsqrP) jsqrP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = JSQR_URL; s.async = true;
    s.onload = () => (window.jsQR ? res(window.jsQR) : rej(new Error("jsQR missing")));
    s.onerror = () => { jsqrP = null; rej(new Error("jsQR failed to load")); };
    document.head.appendChild(s);
  });
  return jsqrP;
}

// Returns a function frame(video, canvas) -> Promise<string|null>.
export async function makeDecoder() {
  try {
    if (typeof window.BarcodeDetector === "function") {
      const fmts = window.BarcodeDetector.getSupportedFormats ? await window.BarcodeDetector.getSupportedFormats() : ["qr_code"];
      if (fmts.includes("qr_code")) {
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
        return async video => { const r = await det.detect(video); return r && r.length ? r[0].rawValue : null; };
      }
    }
  } catch (e) { /* fall through to jsQR */ }
  const jsQR = await loadJsQR();
  return async (video, canvas) => {
    const w = video.videoWidth, h = video.videoHeight; if (!w || !h) return null;
    const scale = Math.min(1, 640 / Math.max(w, h)); // smaller frames decode faster on phones
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    return r ? r.data : null;
  };
}

// Plain-words reason for a camera failure.
export function cameraProblem(e) {
  const n = e && e.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Camera access is blocked for Puntaro. Allow the camera in your browser's site settings, or type the code instead.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No camera found on this device. Type the code instead.";
  if (n === "NotReadableError") return "The camera is busy in another app. Close it and try again.";
  if (e && /jsQR/.test(e.message || "")) return "Couldn't load the QR reader. Check your connection, or type the code instead.";
  return "Couldn't start the camera. Type the code instead.";
}
