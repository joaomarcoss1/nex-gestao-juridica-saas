export async function sha256File(file: File) {
  if (!crypto?.subtle) return "hash-indisponivel-demo";
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function processScannedImage(file: File, mode: "color" | "contrast" | "bw") {
  const image = await loadImageFromFile(file);
  const maxWidth = 1600;
  const ratio = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * ratio);
  canvas.height = Math.round(image.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem para digitalização.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (mode !== "color") {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const gray = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
      const adjusted = mode === "bw" ? (gray > 150 ? 255 : 0) : Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      data.data[i] = adjusted;
      data.data[i + 1] = adjusted;
      data.data[i + 2] = adjusted;
    }
    ctx.putImageData(data, 0, 0);
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function printDocumentPdf(title: string, dataUrl: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{margin:0;background:#0b1422;color:#111;font-family:Arial}.page{width:210mm;min-height:297mm;margin:auto;background:#fff;padding:16mm;box-sizing:border-box}h1{font-size:18px;margin:0 0 12px}.brand{font-size:11px;color:#666;margin-bottom:18px}img{max-width:100%;display:block;margin:auto;border:1px solid #ddd}</style></head><body><div class="page"><h1>${title}</h1><div class="brand">Nex Gestão Jurídica · Desenvolvido por NexLabs</div><img src="${dataUrl}" /></div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  w.document.close();
}
