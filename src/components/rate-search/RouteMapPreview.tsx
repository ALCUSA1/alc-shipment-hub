import { useMemo } from "react";

// Approximate port coordinates (lng, lat) for major trade ports
const PORT_COORDS: Record<string, [number, number]> = {
  USLAX: [-118.2, 33.7], USLGB: [-118.2, 33.8], USNYC: [-74.0, 40.7],
  USHOU: [-95.3, 29.8], USSAV: [-81.1, 32.1], USCHI: [-87.6, 41.9],
  CNSHA: [121.5, 31.2], CNSGH: [121.5, 31.2], CNSZX: [113.9, 22.5],
  CNTAO: [120.3, 36.1], CNNGB: [121.5, 29.9], CNYTN: [113.6, 22.7],
  HKHKG: [114.2, 22.3], JPYOK: [139.6, 35.4], JPTYO: [139.8, 35.6],
  KRPUS: [129.1, 35.1], SGSIN: [103.9, 1.3], TWKHH: [120.3, 22.6],
  VNSGN: [106.7, 10.8], THLCH: [100.9, 13.1], MYKG: [103.4, 1.5],
  INBOM: [72.8, 19.0], INNSA: [73.0, 18.9], INJNPT: [72.9, 18.9],
  LKCMB: [79.9, 6.9], AEJEA: [55.3, 25.3], AEAUH: [54.4, 24.5],
  DEHAM: [10.0, 53.5], NLRTM: [4.5, 51.9], BEANR: [4.4, 51.2],
  GBFXT: [1.3, 51.9], GBLGP: [-3.0, 53.4], FRLEH: [0.1, 49.5],
  ESALG: [-0.5, 36.7], ESVLC: [-0.3, 39.4], ITGOA: [8.9, 44.4],
  GRPIR: [23.6, 37.9], TRIST: [29.0, 41.0], EGPSD: [32.3, 31.3],
  BRSSZ: [-46.3, -23.9], BRSUA: [-43.2, -22.9], ARBUE: [-58.4, -34.6],
  CLVAP: [-71.6, -33.0], MXZLO: [-104.3, 19.1], MXLZC: [-96.1, 16.2],
  PAMIT: [-79.9, 9.4], COBUN: [-75.5, 3.9],
  AUSYD: [151.2, -33.9], AUMEL: [144.9, -37.8], NZAKL: [174.8, -36.8],
  ZADUR: [31.0, -29.9], ZAELS: [25.6, -33.8],
  PKQCT: [67.3, 24.9], BDCGP: [91.8, 22.3],
};

// Simple equirectangular projection
function toSVG(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [x, y];
}

interface RouteMapPreviewProps {
  originCode: string;
  destinationCode: string;
}

export function RouteMapPreview({ originCode, destinationCode }: RouteMapPreviewProps) {
  const coords = useMemo(() => {
    const o = PORT_COORDS[originCode];
    const d = PORT_COORDS[destinationCode];
    if (!o || !d) return null;
    return { origin: toSVG(o[0], o[1]), dest: toSVG(d[0], d[1]) };
  }, [originCode, destinationCode]);

  if (!coords) return null;

  const [ox, oy] = coords.origin;
  const [dx, dy] = coords.dest;

  // Control point for arc
  const mx = (ox + dx) / 2;
  const my = Math.min(oy, dy) - 40;

  return (
    <div className="relative w-full h-32 md:h-40 rounded-xl overflow-hidden bg-primary/5 border border-primary/10">
      <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Grid lines */}
        {[0, 100, 200, 300, 400, 500].map(y => (
          <line key={`h${y}`} x1={0} y1={y} x2={1000} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
        ))}
        {[0, 200, 400, 600, 800, 1000].map(x => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={500} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
        ))}

        {/* Simplified continent outlines as dots for context */}
        {Object.values(PORT_COORDS).map(([lng, lat], i) => {
          const [px, py] = toSVG(lng, lat);
          return <circle key={i} cx={px} cy={py} r="2" fill="hsl(var(--muted-foreground))" opacity="0.15" />;
        })}

        {/* Route arc */}
        <path
          d={`M ${ox} ${oy} Q ${mx} ${my} ${dx} ${dy}`}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          strokeDasharray="6 3"
          opacity="0.6"
        />

        {/* Origin pin */}
        <circle cx={ox} cy={oy} r="6" fill="hsl(var(--accent))" />
        <circle cx={ox} cy={oy} r="10" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" opacity="0.4" />

        {/* Destination pin */}
        <circle cx={dx} cy={dy} r="6" fill="hsl(var(--primary))" />
        <circle cx={dx} cy={dy} r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
      </svg>
    </div>
  );
}
