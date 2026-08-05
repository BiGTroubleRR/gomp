// One-time seed: pushes the catalog that used to live in defaultComponentDb()
// (src/lib/component-db-seed.ts) into the new Supabase `components` table.
// Run once, after supabase/schema.sql's `components` table has been created:
//   node --env-file=.env.local scripts/seed-components.mjs
//
// Safe to re-run: it deletes existing rows for a category before re-inserting it, rather than
// appending duplicates.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — run with --env-file=.env.local');
  process.exit(1);
}
const supabase = createClient(url, key);

// Verbatim from defaultComponentDb() at the time this script was written.
const DB = {
  gpu: [
    { name: 'NVIDIA RTX 5090 FE', price: 1999, specs: '32GB GDDR7 · 575W · PCIe 5.0', tier: 'S', passmark: 38965, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725' },
    { name: 'NVIDIA RTX 4090', price: 1599, specs: '24GB GDDR6X · 450W · PCIe 4.0', tier: 'S', passmark: 38039, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606' },
    { name: 'NVIDIA RTX 5080', price: 1099, specs: '16GB GDDR7 · 360W · PCIe 5.0', tier: 'A', passmark: 35624, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5080&id=5721' },
    { name: 'NVIDIA RTX 4080 Super', price: 999, specs: '16GB GDDR6X · 320W · PCIe 4.0', tier: 'A', passmark: 34226, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984' },
    { name: 'NVIDIA RTX 4080', price: 1099, specs: '16GB GDDR6X · 320W · PCIe 4.0', tier: 'A', passmark: 34443, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080&id=4622' },
    { name: 'AMD Radeon RX 7900 XTX', price: 899, specs: '24GB GDDR6 · 355W · PCIe 4.0', tier: 'A', passmark: 31443, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XTX&id=4644' },
    { name: 'NVIDIA RTX 5070 Ti', price: 899, specs: '16GB GDDR7 · 300W · PCIe 5.0', tier: 'A', passmark: 32349, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070+Ti&id=5878' },
    { name: 'NVIDIA RTX 4070 Ti Super', price: 799, specs: '16GB GDDR6X · 285W · PCIe 4.0', tier: 'A', passmark: 31834, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti+SUPER&id=4980' },
    { name: 'NVIDIA RTX 4070 Ti', price: 749, specs: '12GB GDDR6X · 285W · PCIe 4.0', tier: 'A', passmark: 31540, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti&id=4699' },
    { name: 'NVIDIA RTX 3090 Ti', price: 799, specs: '24GB GDDR6X · 450W · PCIe 4.0', tier: 'B', passmark: 29257, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3090+Ti&id=4524' },
    { name: 'AMD Radeon RX 7900 XT', price: 749, specs: '20GB GDDR6 · 315W · PCIe 4.0', tier: 'B', passmark: 29083, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XT&id=4646' },
    { name: 'NVIDIA RTX 4070 Super', price: 599, specs: '12GB GDDR6X · 220W · PCIe 4.0', tier: 'B', passmark: 29946, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+SUPER&id=4973' },
    { name: 'NVIDIA RTX 5070', price: 599, specs: '12GB GDDR7 · 250W · PCIe 5.0', tier: 'B', passmark: 28648, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070&id=5940' },
    { name: 'AMD Radeon RX 9070 XT', price: 599, specs: '16GB GDDR6 · 304W · PCIe 5.0', tier: 'C', passmark: 26922, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070+XT&id=5956' },
    { name: 'NVIDIA RTX 3080 Ti', price: 549, specs: '12GB GDDR6X · 350W · PCIe 4.0', tier: 'C', passmark: 26754, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3080+Ti&id=4409' },
    { name: 'NVIDIA RTX 4070', price: 549, specs: '12GB GDDR6X · 200W · PCIe 4.0', tier: 'C', passmark: 26874, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070&id=4795' },
    { name: 'AMD Radeon RX 9070', price: 549, specs: '16GB GDDR6 · 220W · PCIe 5.0', tier: 'C', passmark: 25371, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070&id=5958' },
    { name: 'AMD Radeon RX 6800 XT', price: 449, specs: '16GB GDDR6 · 300W · PCIe 4.0', tier: 'C', passmark: 25068, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6800+XT&id=4312' },
    { name: 'AMD Radeon RX 7800 XT', price: 499, specs: '16GB GDDR6 · 263W · PCIe 4.0', tier: 'C', passmark: 24433, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7800+XT&id=4917' },
    { name: 'NVIDIA RTX 5060 Ti 16GB', price: 499, specs: '16GB GDDR7 · 180W · PCIe 5.0', tier: 'D', passmark: 22614, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060+Ti+16GB&id=6160' },
    { name: 'NVIDIA RTX 4060 Ti', price: 399, specs: '8GB GDDR6 · 160W · PCIe 4.0', tier: 'D', passmark: 22596, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060+Ti&id=4827' },
    { name: 'NVIDIA RTX 3070 Ti', price: 379, specs: '8GB GDDR6X · 290W · PCIe 4.0', tier: 'D', passmark: 23181, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3070+Ti&id=4413' },
    { name: 'NVIDIA RTX 5060', price: 329, specs: '8GB GDDR7 · 145W · PCIe 5.0', tier: 'D', passmark: 20663, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060&id=5602' },
    { name: 'NVIDIA RTX 3060 Ti', price: 299, specs: '8GB GDDR6 · 200W · PCIe 4.0', tier: 'D', passmark: 20236, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3060+Ti&id=4318' },
    { name: 'NVIDIA RTX 4060', price: 299, specs: '8GB GDDR6 · 115W · PCIe 4.0', tier: 'D', passmark: 19491, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060&id=4850' },
  ],
  cpu: [
    { name: 'AMD Ryzen 9 9950X3D', price: 650, specs: '16C/32T · 5.7GHz · 170W · 3D V-Cache', tier: 'S', socket: 'AM5', passmark: 70109, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X3D&id=6549' },
    { name: 'AMD Ryzen 9 9950X', price: 485, specs: '16C/32T · 5.7GHz · 170W', tier: 'S', socket: 'AM5', passmark: 65717, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211' },
    { name: 'Intel Core Ultra 9 285K', price: 496, specs: '24C/24T · 5.7GHz · 125W', tier: 'S', socket: 'LGA1851', passmark: 67259, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+9+285K&id=6296' },
    { name: 'AMD Ryzen 9 7950X3D', price: 368, specs: '16C/32T · 5.7GHz · 120W · 3D V-Cache', tier: 'A', socket: 'AM5', passmark: 62303, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X3D&id=5234' },
    { name: 'AMD Ryzen 9 7950X', price: 385, specs: '16C/32T · 5.7GHz · 170W', tier: 'A', socket: 'AM5', passmark: 62150, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X&id=5031' },
    { name: 'Intel Core Ultra 7 265K', price: 324, specs: '20C/20T · 5.5GHz · 125W', tier: 'A', socket: 'LGA1851', passmark: 58599, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265K&id=6326' },
    { name: 'Intel Core Ultra 7 265KF', price: 291, specs: '20C/20T · 5.5GHz · 125W', tier: 'A', socket: 'LGA1851', passmark: 58518, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265KF&id=6338' },
    { name: 'Intel Core i9-14900K', price: 464, specs: '24C/32T · 6.0GHz · 125W', tier: 'A', socket: 'LGA1700', passmark: 58254, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717' },
    { name: 'AMD Ryzen 9 9900X', price: 329, specs: '12C/24T · 5.6GHz · 120W', tier: 'B', socket: 'AM5', passmark: 54349, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9900X&id=6171' },
    { name: 'AMD Ryzen 9 7900X', price: 301, specs: '12C/24T · 5.6GHz · 170W', tier: 'B', socket: 'AM5', passmark: 51238, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7900X&id=5027' },
    { name: 'AMD Ryzen 9 5950X', price: 418, specs: '16C/32T · 4.9GHz · 105W', tier: 'B', socket: 'AM4', passmark: 45270, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5950X&id=3862' },
    { name: 'Intel Core i7-14700K', price: 371, specs: '20C/28T · 5.6GHz · 125W', tier: 'B', socket: 'LGA1700', passmark: 51958, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-14700K&id=5719' },
    { name: 'Intel Core i7-13700K', price: 450, specs: '16C/24T · 5.4GHz · 125W', tier: 'B', socket: 'LGA1700', passmark: 45647, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-13700K&id=5060' },
    { name: 'AMD Ryzen 7 9800X3D', price: 415, specs: '8C/16T · 5.2GHz · 120W · 3D V-Cache', tier: 'C', socket: 'AM5', passmark: 39941, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9800X3D&id=6344' },
    { name: 'AMD Ryzen 7 9700X', price: 280, specs: '8C/16T · 5.5GHz · 65W', tier: 'C', socket: 'AM5', passmark: 36970, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9700X&id=6205' },
    { name: 'AMD Ryzen 7 7700X', price: 218, specs: '8C/16T · 5.4GHz · 105W', tier: 'C', socket: 'AM5', passmark: 35496, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700X&id=5036' },
    { name: 'AMD Ryzen 7 7800X3D', price: 272, specs: '8C/16T · 5.0GHz · 120W · 3D V-Cache', tier: 'C', socket: 'AM5', passmark: 34277, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7800X3D&id=5299' },
    { name: 'AMD Ryzen 7 7700', price: 299, specs: '8C/16T · 5.3GHz · 65W', tier: 'C', socket: 'AM5', passmark: 34337, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700&id=5169' },
    { name: 'AMD Ryzen 7 8700G', price: 264, specs: '8C/16T · 5.1GHz · 65W · Radeon 780M iGPU', tier: 'C', socket: 'AM5', passmark: 31496, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+8700G&id=5836' },
    { name: 'AMD Ryzen 9 5900X', price: 222, specs: '12C/24T · 4.8GHz · 105W', tier: 'C', socket: 'AM4', passmark: 38892, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5900X&id=3870' },
    { name: 'AMD Ryzen 9 3900X', price: 134, specs: '12C/24T · 4.6GHz · 105W', tier: 'C', socket: 'AM4', passmark: 32479, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+3900X&id=3493' },
    { name: 'Intel Core Ultra 5 245K', price: 190, specs: '14C/14T · 5.2GHz · 125W', tier: 'C', socket: 'LGA1851', passmark: 43053, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245K&id=6324' },
    { name: 'Intel Core Ultra 5 245KF', price: 182, specs: '14C/14T · 5.2GHz · 125W', tier: 'C', socket: 'LGA1851', passmark: 43114, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245KF&id=6336' },
    { name: 'Intel Core i5-14600K', price: 259, specs: '14C/20T · 5.3GHz · 125W', tier: 'C', socket: 'LGA1700', passmark: 38412, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-14600K&id=5720' },
    { name: 'Intel Core i5-13600K', price: 319, specs: '14C/20T · 5.1GHz · 125W', tier: 'C', socket: 'LGA1700', passmark: 37462, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-13600K&id=5008' },
  ],
  ram: [
    { name: 'G.Skill Trident Z5 32GB DDR5 6400', price: 130, specs: '2×16GB · CL32 · EXPO/XMP3', tier: 'S' },
    { name: 'Corsair Dominator 32GB DDR5 5600', price: 112, specs: '2×16GB · CL36', tier: 'A' },
  ],
  storage: [
    { name: 'Samsung 990 Pro 2TB NVMe', price: 164, specs: 'PCIe 4.0 · 7450MB/s read', tier: 'S' },
    { name: 'WD Black SN850X 2TB NVMe', price: 156, specs: 'PCIe 4.0 · 7300MB/s read', tier: 'A' },
  ],
  mobo: [
    { name: 'ASUS ROG STRIX X870E-E GAMING WIFI', price: 480, specs: 'X870E · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'S', socket: 'AM5', formFactor: 'ATX' },
    { name: 'ASUS ROG CROSSHAIR X870E HERO', price: 650, specs: 'X870E · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'S', socket: 'AM5', formFactor: 'E-ATX' },
    { name: 'MSI MEG X870E GODLIKE', price: 950, specs: 'X870E · DDR5 · PCIe 5.0 · 5×M.2 · 10GbE', tier: 'S', socket: 'AM5', formFactor: 'E-ATX' },
    { name: 'MSI MAG X670E TOMAHAWK WIFI', price: 330, specs: 'X670E · DDR5 · PCIe 5.0 · 4×M.2', tier: 'A', socket: 'AM5', formFactor: 'ATX' },
    { name: 'Gigabyte B650 AORUS ELITE AX', price: 180, specs: 'B650 · DDR5 · PCIe 4.0 · 3×M.2 · WiFi 6E', tier: 'B', socket: 'AM5', formFactor: 'ATX' },
    { name: 'ASRock B650M PG Lightning', price: 140, specs: 'B650 · DDR5 · PCIe 4.0 · 2×M.2', tier: 'B', socket: 'AM5', formFactor: 'mATX' },
    { name: 'ASUS ROG STRIX B650E-I GAMING WIFI', price: 300, specs: 'B650E · DDR5 · PCIe 5.0 · 2×M.2 · WiFi 6E', tier: 'B', socket: 'AM5', formFactor: 'Mini-ITX' },
    { name: 'Gigabyte A620M S2H', price: 90, specs: 'A620 · DDR5 · PCIe 4.0 · 1×M.2', tier: 'C', socket: 'AM5', formFactor: 'mATX' },
    { name: 'ASUS ROG STRIX X570-E GAMING', price: 280, specs: 'X570 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'B', socket: 'AM4', formFactor: 'ATX' },
    { name: 'MSI B550 TOMAHAWK', price: 150, specs: 'B550 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'C', socket: 'AM4', formFactor: 'ATX' },
    { name: 'ASRock X570M Pro4', price: 150, specs: 'X570 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'C', socket: 'AM4', formFactor: 'mATX' },
    { name: 'Gigabyte B450M DS3H', price: 70, specs: 'B450 · DDR4 · PCIe 3.0 · 1×M.2', tier: 'D', socket: 'AM4', formFactor: 'mATX' },
    { name: 'ASUS ROG MAXIMUS Z790 HERO', price: 630, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'S', socket: 'LGA1700', formFactor: 'ATX' },
    { name: 'MSI MPG Z790 CARBON WIFI', price: 380, specs: 'Z790 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 6E', tier: 'A', socket: 'LGA1700', formFactor: 'ATX' },
    { name: 'ASUS ROG STRIX Z790-I GAMING WIFI', price: 470, specs: 'Z790 · DDR5 · PCIe 5.0 · 2×M.2 · WiFi 6E', tier: 'A', socket: 'LGA1700', formFactor: 'Mini-ITX' },
    { name: 'Gigabyte Z790 AORUS ELITE AX', price: 260, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 6E', tier: 'B', socket: 'LGA1700', formFactor: 'ATX' },
    { name: 'ASRock Z790 Pro RS', price: 190, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2', tier: 'B', socket: 'LGA1700', formFactor: 'ATX' },
    { name: 'ASUS TUF GAMING B760M-PLUS WIFI', price: 160, specs: 'B760 · DDR5 · PCIe 4.0 · 2×M.2 · WiFi 6', tier: 'C', socket: 'LGA1700', formFactor: 'mATX' },
    { name: 'MSI PRO B760M-A WIFI', price: 140, specs: 'B760 · DDR5 · PCIe 4.0 · 2×M.2 · WiFi 6', tier: 'C', socket: 'LGA1700', formFactor: 'mATX' },
    { name: 'MSI MEG Z890 ACE', price: 700, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · 10GbE', tier: 'S', socket: 'LGA1851', formFactor: 'E-ATX' },
    { name: 'ASUS ROG MAXIMUS Z890 HERO', price: 630, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'S', socket: 'LGA1851', formFactor: 'ATX' },
    { name: 'MSI MPG Z890 CARBON WIFI', price: 400, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'A', socket: 'LGA1851', formFactor: 'ATX' },
    { name: 'Gigabyte Z890 AORUS ELITE WIFI7', price: 280, specs: 'Z890 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'B', socket: 'LGA1851', formFactor: 'ATX' },
    { name: 'ASRock Z890 Pro RS WiFi', price: 230, specs: 'Z890 · DDR5 · PCIe 5.0 · 3×M.2 · WiFi 6E', tier: 'B', socket: 'LGA1851', formFactor: 'ATX' },
    { name: 'ASUS PRIME B860M-A WIFI', price: 180, specs: 'B860 · DDR5 · PCIe 4.0 · 3×M.2 · WiFi 6E', tier: 'C', socket: 'LGA1851', formFactor: 'mATX' },
  ],
  cooler: [
    { name: 'NZXT Kraken 360 RGB', price: 156, specs: '360mm AIO · LCD head · AM5/LGA1700', tier: 'S' },
    { name: 'Noctua NH-D15 chromax', price: 86, specs: 'Dual tower · 165mm', tier: 'A' },
  ],
  psu: [
    { name: 'Corsair HX1200i ATX 3.0', price: 217, specs: '1200W · 80+ Platinum · Modular', tier: 'S' },
    { name: 'Seasonic FOCUS GX-850', price: 130, specs: '850W · 80+ Gold · Modular', tier: 'A' },
  ],
  case: [
    { name: 'NZXT H1 V2', price: 217, specs: 'Mini-ITX · Tempered Glass · 280mm AIO Ready', tier: 'A', category: 'SFF' },
    { name: 'Fractal Design Pop Air', price: 95, specs: 'Micro-ATX · Mesh Front · 360mm AIO Ready', tier: 'B', category: 'Mini Tower' },
    { name: 'Fractal Design Meshify 2', price: 130, specs: 'Mid-Tower ATX · Mesh Front · 360mm AIO Ready', tier: 'A', category: 'Mid Tower' },
    { name: 'Lian Li O11D EVO XL', price: 208, specs: 'Full-Tower E-ATX · Tempered Glass · 420mm AIO Ready', tier: 'S', category: 'Full Tower' },
  ],
};

function toRow(category, comp, sortOrder) {
  return {
    category,
    name: comp.name,
    price: comp.price,
    specs: comp.specs,
    tier: comp.tier,
    passmark: comp.passmark ?? null,
    passmark_url: comp.passmarkUrl ?? null,
    market_price: comp.marketPrice ?? null,
    case_size: category === 'case' ? (comp.category ?? null) : null,
    socket: comp.socket ?? null,
    form_factor: comp.formFactor ?? null,
    sort_order: sortOrder,
  };
}

async function main() {
  for (const category of Object.keys(DB)) {
    const rows = DB[category].map((comp, i) => toRow(category, comp, i));
    const { error: delError } = await supabase.from('components').delete().eq('category', category);
    if (delError) {
      console.error(`Failed clearing existing "${category}" rows:`, delError.message);
      process.exit(1);
    }
    const { error: insError, data } = await supabase.from('components').insert(rows).select('id');
    if (insError) {
      console.error(`Failed inserting "${category}":`, insError.message);
      process.exit(1);
    }
    console.log(`${category}: inserted ${data.length} rows`);
  }
  console.log('Done.');
}

main();
