import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { RotateCcw, Save } from "lucide-react";

interface SignaturePadProps {
  label?: string;
  onSave: (dataUrl: string) => void;
  height?: number;
}

export default function SignaturePad({ label = "Assine dentro da área", onSave, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [empty, setEmpty] = useState(true);

  const setup = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0B1F3A";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(15,111,255,.08)";
    ctx.fillRect(0, rect.height - 38, rect.width, 1);
    setEmpty(true);
  };

  useEffect(() => {
    setup();
    const handler = () => setup();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setDrawing(true);
    setEmpty(false);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const end = () => setDrawing(false);

  const salvar = () => {
    const canvas = canvasRef.current;
    if (!canvas || empty) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Registro eletrônico local com hash de validação Nex.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={setup}><RotateCcw className="w-4 h-4" /> Limpar</Button>
          <Button type="button" onClick={salvar} disabled={empty}><Save className="w-4 h-4" /> Salvar</Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none cursor-crosshair"
        style={{ height }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  );
}
