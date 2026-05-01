import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCw, Check, X, Sun, Contrast, Droplet } from "lucide-react";

const FILTERS = [
  { name: "Original", value: "none" },
  { name: "Vivid", value: "saturate(1.4) contrast(1.1)" },
  { name: "Warm", value: "sepia(0.25) saturate(1.3) hue-rotate(-10deg)" },
  { name: "Cool", value: "saturate(1.1) hue-rotate(15deg) brightness(1.05)" },
  { name: "B&W", value: "grayscale(1) contrast(1.1)" },
  { name: "Fade", value: "contrast(0.85) brightness(1.1) saturate(0.8)" },
] as const;

type Adjust = { brightness: number; contrast: number; saturate: number };

export function PhotoEditor({
  src, onCancel, onSave,
}: { src: string; onCancel: () => void; onSave: (blob: Blob) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [filter, setFilter] = useState<string>("none");
  const [adj, setAdj] = useState<Adjust>({ brightness: 100, contrast: 100, saturate: 100 });
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, p: Area) => setPixels(p), []);

  const fullFilter = `${filter} brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturate}%)`;

  async function handleSave() {
    if (!pixels) return;
    setBusy(true);
    try {
      const blob = await renderCropped(src, pixels, rotation, fullFilter);
      onSave(blob);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">Éditer la photo</span>
        <button onClick={handleSave} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect}
          onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          style={{ mediaStyle: { filter: fullFilter } }}
        />
      </div>

      <div className="space-y-3 bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {([1, 4/5, 3/4, 16/9] as const).map((a) => (
            <button key={a} onClick={() => setAspect(a)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${aspect === a ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {a === 1 ? "1:1" : a === 4/5 ? "4:5" : a === 3/4 ? "3:4" : "16:9"}
            </button>
          ))}
          <button onClick={() => setRotation((r) => (r + 90) % 360)} className="flex-shrink-0 flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
            <RotateCw className="h-3.5 w-3.5" /> Rotation
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.name} onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 rounded-2xl border-2 px-3 py-2 text-xs font-medium ${filter === f.value ? "border-primary bg-accent" : "border-border bg-card"}`}>
              {f.name}
            </button>
          ))}
        </div>

        <Slider icon={<Sun className="h-4 w-4" />} label="Lumière" value={adj.brightness} onChange={(v) => setAdj({ ...adj, brightness: v })} />
        <Slider icon={<Contrast className="h-4 w-4" />} label="Contraste" value={adj.contrast} onChange={(v) => setAdj({ ...adj, contrast: v })} />
        <Slider icon={<Droplet className="h-4 w-4" />} label="Saturation" value={adj.saturate} onChange={(v) => setAdj({ ...adj, saturate: v })} />
      </div>
    </div>
  );
}

function Slider({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="flex-1">
        <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground"><span>{label}</span><span>{value}%</span></div>
        <input type="range" min={50} max={150} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
      </div>
    </div>
  );
}

async function renderCropped(src: string, area: Area, rotation: number, filter: string): Promise<Blob> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;
  const c = document.createElement("canvas");
  c.width = bW; c.height = bH;
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  const data = ctx.getImageData(area.x, area.y, area.width, area.height);
  c.width = area.width; c.height = area.height;
  ctx.filter = "none";
  ctx.putImageData(data, 0, 0);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.92));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
