// One-off import: every motherboard eD system a.s. (edshop.edsystem.cz) lists on a "600 and
// higher" chipset — Intel 600/700/800-series (H610/B660/B760/H770/Q670/W680/W790/Q870/H810/B860/
// Z890/W880) and AMD 600/800-series AM5 (A620/B650/B650E/X670/X670E/B840/B850/X870/X870E) — mined
// by paging through the site's "Chipset" filter (which the /build catalog otherwise has no
// equivalent structured field for) and scanning each listing card's own title text, the only
// place chipset/socket/RAM-generation/form-factor are actually stated for these bulk-imported
// rows. Anything on an older chipset (400/500-series and earlier sockets) was excluded at the
// source by that same filter, per the request this script was written for.
//
// Prices/tiers have no public source here (eD system is a B2B distributor — prices are hidden
// behind a login on every product page) — same situation scripts/import-gpu-variants.mjs hit for
// its manufacturer variants, resolved the same way: a single reasonable-estimate price/tier per
// chipset (CHIPSET_INFO below), not a real per-SKU figure. Refinable later via Admin.
//
// Images follow scripts/import-edsystem-cases.mjs's own convention: the site's bare "_0a.jpg"
// gallery image (largest/original) is downloaded and re-hosted in this project's own
// `component-images` Supabase Storage bucket, not hotlinked from eD's CDN — the listing pages
// only expose the smaller "_0a_7.jpg"/"_0a_10.jpg" IMGCACHE thumbnails, so the suffix is stripped
// back off before downloading.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'component-images';
const EDSYSTEM = 'https://edshop.edsystem.cz';

// Raw {h: href, n: title, i: thumbnail image path} rows scraped from the filtered listing
// (Komponenty > Základní desky, Chipset facet = every 600-and-up chipset the site offers) via
// its own "Další produkty" load-more button, clicked until all matching rows were in the DOM.
const RAW_ITEMS = [];
RAW_ITEMS.push(
  {"h":"/asrock-mb-sc-lga1700-b760-pro-rs-intel-b760-4xddr5-1xdp-1xhdmi/product-1646362","n":"ASRock MB Sc LGA1700 B760 PRO RS, Intel B760, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1646/1646362_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-steel-legend-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1646366","n":"ASRock MB Sc LGA1700 B760M STEEL LEGEND WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1646/1646366_0a_7.jpg"},
  {"h":"/gigabyte-mb-sc-am5-a620m-gaming-x-amd-a620-4xddr5-1xdp-1xhdmi/product-1656742","n":"GIGABYTE MB Sc AM5 A620M GAMING X, AMD A620, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1656/1656742_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-pro-rs-intel-b760-4xddr5-1xdp-1xhdmi-matx/product-1688833","n":"ASRock MB Sc LGA1700 B760M PRO RS, Intel B760, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1688/1688833_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-hdv-m-2-intel-b760-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1688834","n":"ASRock MB Sc LGA1700 B760M-HDV/M.2, Intel B760, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1688/1688834_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-hdv-m-2-d5-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1688839","n":"ASRock MB Sc LGA1700 H610M-HDV/M.2+ D5, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1688/1688839_0a_7.jpg"},
  {"h":"/asrock-mb-sc-am5-b650m-pro-rs-amd-b650-4xddr5-1xdp-1xhdmi-matx/product-1688469","n":"ASRock MB Sc AM5 B650M PRO RS, AMD B650, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1688/1688469_0a_7.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-steel-legend-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728303","n":"ASRock MB Sc AM5 X870 STEEL LEGEND WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728303_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-lightning-wifi-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728313","n":"ASRock MB Sc LGA1851 Z890 LIGHTNING WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728313_0a_7.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-nova-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi/product-1728311","n":"ASRock MB Sc LGA1851 Z890 NOVA WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728311_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-lightning-wifi-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-matx/product-1738257","n":"ASRock MB Sc LGA1851 B860M Lightning WiFi, Intel B860, 4xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738257_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-steel-legend-wifi-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-atx/product-1738250","n":"ASRock MB Sc LGA1851 B860 Steel Legend WiFi, Intel B860, 4xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738250_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-livemixer-wifi-intel-b860-4xddr5-1xthunderbolt-1xhdmi-wifi-atx/product-1738251","n":"ASRock MB Sc LGA1851 B860 LiveMixer WiFi, Intel B860, 4xDDR5, 1xThunderbolt, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738251_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-pro-rs-wifi-intel-b860-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738253","n":"ASRock MB Sc LGA1851 B860 Pro RS WiFi, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738253_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860i-lightning-wifi-intel-b860-2xddr5-1xthunderbolt-1xhdmi-wifi-mini-itx/product-1743309","n":"ASRock MB Sc LGA1851 B860I LIGHTNING WIFI, Intel B860, 2xDDR5, 1xThunderbolt, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1743/1743309_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-x-wifi-intel-b860-2xddr5-1xdp-1xhdmi-wifi-matx/product-1753299","n":"ASRock MB Sc LGA1851 B860M-X WIFI, Intel B860, 2xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1753/1753299_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-pro-a-wifi-amd-a620a-4xddr5-1xhdmi-wifi/product-1775631","n":"ASRock MB Sc AM5 A620AM PRO-A WIFI, AMD A620A, 4xDDR5, 1xHDMI, WIFI","i":"/IMGCACHE/_1775/1775631_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620ai-wifi-amd-a620a-2xddr5-1xhdmi-wifi/product-1775641","n":"ASRock MB Sc AM5 A620AI WIFI AMD A620A, 2xDDR5, 1xHDMI, WIFI","i":"/IMGCACHE/_1775/1775641_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1871-b860m-x-gen5-wifi-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1795790","n":"ASRock MB Sc LGA1871 B860M-X Gen5 WiFi, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1795/1795790_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1871-b860m-x-gen5-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1795791","n":"ASRock MB Sc LGA1871 B860M-X Gen5, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1795/1795791_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-x-gen5-intel-b760-2xddr5-1xdp-1xhdmi-matx/product-1795793","n":"ASRock MB Sc LGA1700 B760M-X Gen5, Intel B760, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1795/1795793_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-rock-wifi-7-amd-b850-4xddr5-1xhdmi-wifi-matx/product-1799082","n":"ASRock MB Sc AM5 B850 Rock WiFi 7, AMD B850, 4xDDR5, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1799/1799082_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-rock-wifi-intel-b860-2xddr5-1xhdmi-1x-dp-wifi-matx/product-1802454","n":"ASRock MB Sc LGA1851 B860M ROCK WIFI, Intel B860, 2xDDR5, 1xHDMI, 1x DP, WiFi, mATX","i":"/IMGCACHE/_1802/1802454_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-challenger-wifi-white-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1826231","n":"ASRock MB Sc AM5 X870 Challenger WiFi WHITE, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1826/1826231_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-h2-m-2-intel-b760-2xddr5-2xhdmi-matx/product-1701108","n":"ASRock MB Sc LGA1700 B760M-H2/M.2, Intel B760, 2xDDR5, 2xHDMI, mATX","i":"/IMGCACHE/_1701/1701108_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-k-ddr5-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1692406","n":"ASUS MB Sc LGA1700 PRIME H610M-K DDR5, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1692/1692406_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-k-ddr4-intel-b760-2xddr4-1xhdmi-1xvga-matx/product-1692407","n":"ASUS MB Sc LGA1700 PRIME B760M-K DDR4, Intel B760, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1692/1692407_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650m-a-ii-csm-amd-b650-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1693645","n":"ASUS MB Sc AM5 PRIME B650M-A II-CSM, AMD B650, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1693/1693645_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-b760m-c-csm-intel-b760-4xddr5-2xdp-1xhdmi-1xvga-matx/product-1684986","n":"ASUS MB Sc LGA1700 PRO B760M-C-CSM, Intel B760, 4xDDR5, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1684/1684986_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-intel-b760-4xddr5-1xdp-1xhdmi-matx/product-1684974","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS, Intel B760, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1684/1684974_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760-plus-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi/product-1684969","n":"ASUS MB Sc LGA1700 TUF GAMING B760-PLUS WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1684/1684969_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-k-intel-b760-2xddr5-1xhdmi-1xvga-matx/product-1684983","n":"ASUS MB Sc LGA1700 PRIME B760M-K, Intel B760, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1684/1684983_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-proart-b760-creator-wifi-intel-b760-4xddr5-1xdp-1xhdmi-atx/product-1684984","n":"ASUS MB Sc LGA1700 PROART B760-CREATOR WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1684/1684984_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-a-csm-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1679724","n":"ASUS MB Sc LGA1700 PRIME H610M-A-CSM, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1679/1679724_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-e-csm-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1681663","n":"ASUS MB Sc LGA1700 PRIME H610M-E-CSM, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1681/1681663_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-k-argb-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1681666","n":"ASUS MB Sc LGA1700 PRIME H610M-K ARGB, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1681/1681666_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-a-gaming-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi/product-1684965","n":"ASUS MB Sc LGA1700 ROG STRIX B760-A GAMING WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1684/1684965_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-a620m-a-csm-amd-a620-4xddr5-1xhdmi-1xdp-1xvga-matx/product-1656347","n":"ASUS MB Sc AM5 PRIME A620M-A-CSM, AMD A620, 4xDDR5, 1xHDMI, 1xDP, 1xVGA, mATX","i":"/IMGCACHE/_1656/1656347_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650m-plus-amd-b650-4xddr5-1xdp-1xhdmi-matx/product-1639149","n":"ASUS MB Sc AM5 TUF GAMING B650M-PLUS, AMD B650, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1639/1639149_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-k-ddr4-intel-b760-2xddr4-1xhdmi-1xvga-matx/product-1645387","n":"ASUS MB Sc LGA1700 PRIME B760M-K DDR4, Intel B760, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1645/1645387_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-btf-wifi-d4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi/product-1657754","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-BTF WIFI D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1657/1657754_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-a620m-e-csm-amd-a620-2xddr5-1xhdmi-1xdp-1xvga-matx/product-1660530","n":"ASUS MB Sc AM5 PRIME A620M-E-CSM, AMD A620, 2xDDR5, 1xHDMI, 1xDP, 1xVGA, mATX","i":"/IMGCACHE/_1660/1660530_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650m-e-amd-b650-4xddr5-2xdp-1xhdmi-matx/product-1661476","n":"ASUS MB Sc AM5 TUF GAMING B650M-E, AMD B650, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1661/1661476_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650-plus-amd-b650-4xddr5-1xdp-1xhdmi/product-1638729","n":"ASUS MB Sc AM5 TUF GAMING B650-PLUS, AMD B650, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1638/1638729_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b650-a-gaming-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1639146","n":"ASUS MB Sc AM5 ROG STRIX B650-A GAMING WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1639/1639146_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-z890-i-gaming-wifi-intel-z890-2xddr5-1xhdmi-2xthunderbolt-wi-fi-mini-itx/product-1740699","n":"ASUS MB Sc LGA1851 ROG STRIX Z890-I GAMING WIFI, Intel Z890, 2xDDR5, 1xHDMI, 2xThunderbolt, WI-FI, Mini-ITX","i":"/IMGCACHE/_1740/1740699_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-b860-plus-csm-intel-b860-4xddr5-1xdp-1xhdmi-atx/product-1738207","n":"ASUS MB Sc LGA1851 PRIME B860-PLUS-CSM, Intel B860, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1738/1738207_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b840-plus-wifi-amd-b840-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738196","n":"ASUS MB Sc AM5 PRIME B840-PLUS WIFI, AMD B840, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738196_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-a620am-plus-4xddr5-2xdp-1xhdmi-matx/product-1778073","n":"ASUS MB Sc AM5 TUF GAMING A620AM-PLUS, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1778/1778073_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-a620am-a-csm-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1777747","n":"ASUS MB Sc AM5 PRIME A620AM-A-CSM, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1777/1777747_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b850m-f-wifi-amd-b850-2x-ddr5-wifi-1xhdmi-matx/product-1782480","n":"ASUS MB Sc AM5 PRIME B850M-F WIFI, AMD B850, 2x DDR5, WiFi, 1xHDMI, mATX","i":"/IMGCACHE/_1782/1782480_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b850m-f-amd-b850-2x-ddr5-1x-hdmi-matx/product-1782481","n":"ASUS MB Sc AM5 PRIME B850M-F, AMD B850, 2x DDR5, 1x HDMI, mATX","i":"/IMGCACHE/_1782/1782481_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-k-d4-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1773351","n":"ASUS MB Sc LGA1700 PRIME H610M-K D4, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1773/1773351_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-ii-intel-b760-4xddr5-1xdp-1xhdmi-matx/product-1770408","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS II, Intel B760, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1770/1770408_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-b650e-max-gaming-wifi-w-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1753327","n":"ASUS MB Sc AM5 B650E MAX GAMING WIFI W, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1753/1753327_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b850m-k-amd-b850-2xddr5-1xdp-1xhdmi-matx/product-1756043","n":"ASUS MB Sc AM5 PRIME B850M-K, AMD B850, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1756/1756043_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-b650e-max-gaming-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1753286","n":"ASUS MB Sc AM5 B650E MAX GAMING WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1753/1753286_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650e-plus-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1757853","n":"ASUS MB Sc AM5 TUF GAMING B650E-PLUS WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1757/1757853_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/asus-mb-sc-am5-prime-b850m-a-wifi-amd-b850-4xddr5-2xdp-1xhdmi-wifi-matx/product-1762056","n":"ASUS MB Sc AM5 PRIME B850M-A WIFI, AMD B850, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1762/1762056_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-ds3h-gen5-intel-b760-4xddr5-2xdp-1xhdmi-1xvga-matx/product-1770910","n":"GIGABYTE MB Sc LGA1700 B760M DS3H GEN5, Intel B760, 4xDDR5, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1770/1770910_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-aorus-stealth-ice-amd-b850-4xddr5-1xhdmi/product-1770911","n":"GIGABYTE MB Sc AM5 B850 AORUS STEALTH ICE, AMD B850, 4xDDR5, 1xHDMI","i":"/IMGCACHE/_1770/1770911_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b840m-ds3h-wifi6-amd-b840-4xddr5-wifi-dp-hdmi-matx/product-1770914","n":"GIGABYTE MB Sc AM5 B840M DS3H WIFI6, AMD B840, 4xDDR5,WIFI, DP, HDMI, mATX","i":"/IMGCACHE/_1770/1770914_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b840m-a-elite-wifi6e-amd-b840-4xddr5-wifi-dp-hdmi-matx/product-1785947","n":"GIGABYTE MB Sc AM5 B840M A ELITE WIFI6E, AMD B840, 4xDDR5, WIFI, DP, HDMI, mATX","i":"/IMGCACHE/_1785/1785947_0a_10.jpg"},
  {"h":"/gigabyte-mb-q870m-d3h-intel-q870-4xddr5-dp-hdmi-matx/product-1785950","n":"GIGABYTE MB Q870M D3H, Intel Q870, 4xDDR5, DP, HDMI, mATX","i":"/IMGCACHE/_1785/1785950_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-a-elite-x-amd-x870e-4xddr5-2xusb-c-2xhdmi-atx/product-1791908","n":"GIGABYTE MB Sc AM5 X870E A ELITE X, AMD X870E, 4xDDR5, 2xUSB-C, 2xHDMI, ATX","i":"/IMGCACHE/_1791/1791908_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-eagle-wf6e-amd-b850-4xddr5-1xhdmi-2xdp-wifi-matx/product-1795005","n":"GIGABYTE MB Sc AM5 B850M EAGLE WF6E, AMD B850, 4xDDR5, 1xHDMI, 2xDP, Wifi, mATX","i":"/IMGCACHE/_1795/1795005_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890i-aorus-ultra-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-wifi-mitx/product-1729836","n":"GIGABYTE MB Sc LGA1851 Z890I AORUS ULTRA, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, WiFi, mITX","i":"/IMGCACHE/_1729/1729836_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-aero-g-intel-z890-4xddr5-2xhdmi-1xthunderbolt-wifi/product-1729825","n":"GIGABYTE MB Sc LGA1851 Z890 AERO G, Intel Z890, 4xDDR5, 2xHDMI, 1xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729825_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-elite-x-ice-intel-z890-4xddr5-1xhdmi-1xthunderbolt-wifi/product-1729826","n":"GIGABYTE MB Sc LGA1851 Z890 A ELITE X ICE, Intel Z890, 4xDDR5, 1xHDMI, 1xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729826_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610i-intel-h610-2xddr5-2xdp-1xhdmi-1xvga-mini-itx/product-1726979","n":"GIGABYTE MB Sc LGA1700 H610I, Intel H610, 2xDDR5, 2xDP, 1xHDMI, 1xVGA, Mini-ITX","i":"/IMGCACHE/_1726/1726979_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-a-elite-wifi7-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727690","n":"GIGABYTE MB Sc AM5 X870 A ELITE WIFI7, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727690_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-aorus-pro-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727736","n":"GIGABYTE MB Sc AM5 X870E AORUS PRO, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727736_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-gaming-x-wifi7-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1728088","n":"GIGABYTE MB Sc AM5 X870 GAMING X WIFI7, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1728/1728088_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-gaming-wifi-ddr4-intel-h610-2xddr4-2xdp-1xhdmi-wifi-matx/product-1742955","n":"GIGABYTE MB Sc LGA1700 H610M GAMING WIFI DDR4, Intel H610, 2xDDR4, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1742/1742955_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860i-aorus-pro-ice-intel-b860-2xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-mini-itx/product-1742218","n":"GIGABYTE MB Sc LGA1851 B860I AORUS PRO ICE, Intel B860, 2xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1742/1742218_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-ud-ax-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1752935","n":"GIGABYTE MB Sc AM5 B650 UD AX, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1752/1752935_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-aorus-elite-wifi6e-ice-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-matx/product-1740691","n":"GIGABYTE MB Sc LGA1851 B860M AORUS ELITE WIFI6E ICE, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1740/1740691_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-gaming-x-ddr4-intel-b760-4xddr4-1xdp-1xhdmi-matx/product-1646459","n":"GIGABYTE MB Sc LGA1700 B760M GAMING X DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1646/1646459_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-aero-g-amd-b650-4xddr5-1xhdmi-1xusb-c-wi-fi/product-1703532","n":"GIGABYTE MB Sc AM5 B650 AERO G, AMD B650, 4xDDR5, 1xHDMI, 1xUSB-C, WI-FI","i":"/IMGCACHE/_1703/1703532_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-gaming-x-wf6e-amd-b850-4xddr5-2xdp-1xhdmi-wifi-matx/product-1740686","n":"GIGABYTE MB Sc AM5 B850M GAMING X WF6E, AMD B850, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1740/1740686_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b840m-ds3h-amd-b840-4xddr5-2xdp-1xhdmi-matx/product-1751646","n":"GIGABYTE MB Sc AM5 B840M DS3H, AMD B840, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1751/1751646_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-pro-rs-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1743303","n":"ASRock MB Sc AM5 B850M PRO RS WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1743/1743303_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-pro-rs-amd-b850-4xddr5-1xdp-1xhdmi-matx/product-1743304","n":"ASRock MB Sc AM5 B850M PRO RS, AMD B850, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1743/1743304_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-pro-a-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1743305","n":"ASRock MB Sc AM5 B850M PRO-A WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1743/1743305_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-pro-a-amd-b850-4xddr5-1xdp-1xhdmi-matx/product-1743306","n":"ASRock MB Sc AM5 B850M PRO-A, AMD B850, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1743/1743306_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-x-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1743307","n":"ASRock MB Sc LGA1851 B860M-X, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1743/1743307_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-pro-a-intel-b860-4xddr5-1xdp-1xhdmi-atx/product-1738254","n":"ASRock MB Sc LGA1851 B860 Pro-A, Intel B860, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1738/1738254_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-pro-a-wifi-intel-b860-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738255","n":"ASRock MB Sc LGA1851 B860 Pro-A WiFi, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738255_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-pro-rs-intel-b860-4xddr5-1xdp-1xhdmi-atx/product-1738252","n":"ASRock MB Sc LGA1851 B860 PRO RS, Intel B860, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1738/1738252_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-steel-legend-wifi-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-matx/product-1738258","n":"ASRock MB Sc LGA1851 B860M Steel Legend WiFi, Intel B860, 4xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738258_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-livemixer-wifi-intel-b860-4xddr5-1xthunderbolt-1xhdmi-wifi-matx/product-1738259","n":"ASRock MB Sc LGA1851 B860M LiveMixer WiFi, Intel B860, 4xDDR5, 1xThunderbolt, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738259_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-pro-rs-intel-b860-4xddr5-1xdp-1xhdmi-matx/product-1738260","n":"ASRock MB Sc LGA1851 B860M Pro RS, Intel B860, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1738/1738260_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-pro-rs-wifi-intel-b860-4xddr5-1xdp-1xhdmi-wifi-matx/product-1738261","n":"ASRock MB Sc LGA1851 B860M Pro RS WiFi, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738261_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-pro-a-intel-b860-4xddr5-1xdp-1xhdmi-matx/product-1739480","n":"ASRock MB Sc LGA1851 B860M Pro-A, Intel B860, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1739/1739480_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-pro-a-wifi-intel-b860-4xddr5-1xdp-1xhdmi-wifi-matx/product-1739481","n":"ASRock MB Sc LGA1851 B860M Pro-A WiFi, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1739/1739481_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860i-wifi-intel-b860-2xddr5-1xdp-1xhdmi-wifi-mini-itx/product-1739482","n":"ASRock MB Sc LGA1851 B860I WiFi, Intel B860, 2xDDR5, 1xDP, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1739/1739482_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-riptide-wifi-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1739483","n":"ASRock MB Sc AM5 B850 Riptide WiFi, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1739/1739483_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-steel-legend-wifi-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1739484","n":"ASRock MB Sc AM5 B850 Steel Legend WiFi, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1739/1739484_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-livemixer-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1739485","n":"ASRock MB Sc AM5 B850 LiveMixer WiFi, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1739/1739485_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-pro-rs-amd-b850-4xddr5-1xusb-c-1xhdmi-atx/product-1739486","n":"ASRock MB Sc AM5 B850 Pro RS, AMD B850, 4xDDR5, 1xUSB-C, 1xHDMI, ATX","i":"/IMGCACHE/_1739/1739486_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-pro-rs-wifi-amd-b850-4xddr5-1xusb-c-hdmi-wifi-atx/product-1739487","n":"ASRock MB Sc AM5 B850 Pro RS WiFi, AMD B850, 4xDDR5, 1xUSB-C, HDMI, WiFi, ATX","i":"/IMGCACHE/_1739/1739487_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-pro-a-amd-b850-4xddr5-1xusb-c-hdmi-atx/product-1739488","n":"ASRock MB Sc AM5 B850 Pro-A, AMD B850, 4xDDR5, 1xUSB-C, HDMI, ATX","i":"/IMGCACHE/_1739/1739488_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850-pro-a-wifi-amd-b850-4xddr5-1xusb-c-1xhdmi-wifi-atx/product-1739489","n":"ASRock MB Sc AM5 B850 Pro-A WiFi, AMD B850, 4xDDR5, 1xUSB-C, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1739/1739489_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850i-lightning-wifi-amd-b850-2xddr5-1xusb4-1xhdmi-wifi-mini-itx/product-1739492","n":"ASRock MB Sc AM5 B850I Lightning WiFi, AMD B850, 2xDDR5, 1xUSB4, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1739/1739492_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-steel-legend-wifi-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728314","n":"ASRock MB Sc LGA1851 Z890 STEEL LEGEND WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728314_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-livemixer-wifi-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728315","n":"ASRock MB Sc LGA1851 Z890 LIVEMIXER WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728315_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-pro-rs-wifi-white-intel-z890-4xddr5-1xhdmi-wi-fi/product-1728316","n":"ASRock MB Sc LGA1851 Z890 PRO RS WIFI WHITE, Intel Z890, 4xDDR5, 1xHDMI, WI-FI","i":"/IMGCACHE/_1728/1728316_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-pro-rs-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi/product-1728317","n":"ASRock MB Sc LGA1851 Z890 PRO RS, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728317_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-pro-a-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-wi-fi/product-1728318","n":"ASRock MB Sc LGA1851 Z890 PRO-A WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728318_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-pro-a-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt/product-1728319","n":"ASRock MB Sc LGA1851 Z890 PRO-A, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt","i":"/IMGCACHE/_1728/1728319_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-pro-rs-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728304","n":"ASRock MB Sc AM5 X870 PRO RS WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728304_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-pro-rs-amd-x870-4xddr5-1xhdmi-2xusb4/product-1728305","n":"ASRock MB Sc AM5 X870 PRO RS, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4","i":"/IMGCACHE/_1728/1728305_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-taichi-aqua-intel-z890-4xddr5-2xthunderbolt-wi-fi-eatx/product-1728306","n":"ASRock MB Sc LGA1851 Z890 TAICHI AQUA, Intel Z890, 4xDDR5, 2xThunderbolt, WI-FI, EATX","i":"/IMGCACHE/_1728/1728306_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-taichi-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728309","n":"ASRock MB Sc LGA1851 Z890 TAICHI, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728309_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-taichi-lite-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728310","n":"ASRock MB Sc LGA1851 Z890 TAICHI LITE, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728310_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-h2-m-2-intel-h610-2xddr4-2xhdmi-matx/product-1728093","n":"ASRock MB Sc LGA1700 H610M-H2/M.2, Intel H610, 2xDDR4, 2xHDMI, mATX","i":"/IMGCACHE/_1728/1728093_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870e-taichi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728299","n":"ASRock MB Sc AM5 X870E TAICHI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728299_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870e-taichi-lite-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728300","n":"ASRock MB Sc AM5 X870E TAICHI LITE, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728300_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/asrock-mb-sc-am5-x870e-nova-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728301","n":"ASRock MB Sc AM5 X870E NOVA WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728301_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-riptide-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1728302","n":"ASRock MB Sc AM5 X870 RIPTIDE WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1728/1728302_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890-riptide-wifi-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi/product-1728312","n":"ASRock MB Sc LGA1851 Z890 RIPTIDE WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI","i":"/IMGCACHE/_1728/1728312_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890m-riptide-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi-matx/product-1734622","n":"ASRock MB Sc LGA1851 Z890M RIPTIDE WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI, mATX","i":"/IMGCACHE/_1734/1734622_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-z890i-nova-wifi-intel-z890-2xddr5-1xhdmi-2xthunderbolt-wi-fi-mitx/product-1734623","n":"ASRock MB Sc LGA1851 Z890I NOVA WIFI, Intel Z890, 2xDDR5, 1xHDMI, 2xThunderbolt, WI-FI, mITX","i":"/IMGCACHE/_1734/1734623_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650-steel-legend-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1710007","n":"ASRock MB Sc AM5 B650 Steel Legend WiFi , AMD B650, 4xDDR5, 1xDP, 1xHDMI, WIFI","i":"/IMGCACHE/_1710/1710007_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650m-hdv-m-2-amd-b650-2xddr5-1xdp-1xhdmi-matx/product-1688471","n":"ASRock MB Sc AM5 B650M-HDV/M.2, AMD B650, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1688/1688471_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650m-h-m-2-amd-b650-2xddr5-1xdp-1xhdmi-matx/product-1681922","n":"ASRock MB Sc AM5 B650M-H/M.2+, AMD B650, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1681/1681922_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-h2-m-2-d5-intel-h610-2xddr5-2xhdmi-matx/product-1681926","n":"ASRock MB Sc LGA1700 H610M-H2/M.2 D5, Intel H610, 2xDDR5, 2xHDMI, mATX","i":"/IMGCACHE/_1681/1681926_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-a620i-ax-amd-a620-2xddr5-1xdp-1xhdmi-wifi-mini-itx/product-1667198","n":"GIGABYTE MB Sc AM5 A620I AX, AMD A620, 2xDDR5, 1xDP, 1xHDMI, WiFi, mini-ITX","i":"/IMGCACHE/_1667/1667198_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-hdv-m-2-r2-0-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1687064","n":"ASRock MB Sc LGA1700 H610M-HDV/M.2 R2.0, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1687/1687064_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650i-lightning-wifi-amd-b650-2xddr5-1xhdmi-mini-itx/product-1688459","n":"ASRock MB Sc AM5 B650I LIGHTNING WIFI, AMD B650, 2xDDR5, 1xHDMI, Mini-ITX","i":"/IMGCACHE/_1688/1688459_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-a620m-h-amd-a620-2xddr5-1xdp-1xhdmi-matx/product-1662160","n":"GIGABYTE MB Sc AM5 A620M H, AMD A620, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1662/1662160_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-a620m-ds3h-amd-a620-4xddr5-1xdp-1xhdmi-1xd-sub/product-1663659","n":"GIGABYTE MB Sc AM5 A620M DS3H, AMD A620, 4xDDR5, 1xDP, 1xHDMI, 1xD-Sub","i":"/IMGCACHE/_1663/1663659_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650-pg-lightning-amd-b650-4xddr5-1xhdmi/product-1639160","n":"ASRock MB Sc AM5 B650 PG Lightning, AMD B650, 4xDDR5, 1xHDMI","i":"/IMGCACHE/_1639/1639160_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760m-hdv-m-2-d4-intel-b760-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1646368","n":"ASRock MB Sc LGA1700 B760M-HDV/M.2 D4, Intel B760, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1646/1646368_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-hvs-m-2-r2-0-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1631187","n":"ASRock MB Sc LGA1700 H610M-HVS/M.2 R2.0, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1631/1631187_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b650-pro-rs-amd-b650-4xddr5-1xdp-1xhdmi/product-1637316","n":"ASRock MB Sc AM5 B650 PRO RS, AMD B650, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1637/1637316_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-taichi-creator-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1793895","n":"ASRock MB Sc AM5 X870 TAICHI Creator, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1793/1793895_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-livemixer-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1793898","n":"ASRock MB Sc AM5 X870 LiveMixer WiFi, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1793/1793898_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-hdv-m-2-d5-gen5-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1802447","n":"ASRock MB Sc LGA1700 H610M-HDV/M.2 D5 Gen5, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1802/1802447_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-h610m-hvs-m-2-d5-gen5-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1802449","n":"ASRock MB Sc LGA1700 H610M-HVS/M.2 D5 Gen5, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1802/1802449_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-challenger-wifi-white-intel-b860-4xddr5-1xhdmi-wifi-atx/product-1799060","n":"ASRock MB Sc LGA1851 B860 Challenger WiFi WHITE, Intel B860, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1799/1799060_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-challenger-wifi-intel-b860-4xddr5-1xhdmi-wifi-atx/product-1799061","n":"ASRock MB Sc LGA1851 B860 Challenger WiFi, Intel B860, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1799/1799061_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860-rock-wifi-7-intel-b860-4xddr5-1xhdmi-wifi-atx/product-1799062","n":"ASRock MB Sc LGA1851 B860 Rock WiFi 7, Intel B860, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1799/1799062_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-rock-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1799064","n":"ASRock MB Sc AM5 B850M ROCK WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1799/1799064_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-challenger-amd-b850-4xddr5-1xhdmi-matx/product-1799065","n":"ASRock MB Sc AM5 B850M Challenger, AMD B850, 4xDDR5, 1xHDMI, mATX","i":"/IMGCACHE/_1799/1799065_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-challenger-wifi-amd-b850-4xddr5-1xhdmi-wifi-matx/product-1799076","n":"ASRock MB Sc AM5 B850M Challenger WiFi, AMD B850, 4xDDR5, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1799/1799076_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-challenger-wifi-white-amd-b850-4xddr5-1xhdmi-wifi-matx/product-1799077","n":"ASRock MB Sc AM5 B850M Challenger WiFi WHITE, AMD B850, 4xDDR5, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1799/1799077_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870e-taichi-ocf-amd-x870e-2xddr5-wifi-1xhdmi-2xusb4/product-1795971","n":"ASRock MB Sc AM5 X870E TAICHI OCF, AMD X870E, 2xDDR5, WiFi, 1xHDMI, 2xUSB4","i":"/IMGCACHE/_1795/1795971_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-nova-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1775586","n":"ASRock MB Sc AM5 X870 NOVA WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1775/1775586_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-pro-rs-wifi-amd-x620-4xddr5-1xhdmi-1xdp-wi-fi/product-1775626","n":"ASRock MB Sc AM5 A620AM PRO RS WIFI, AMD X620, 4xDDR5, 1xHDMI, 1xDP, WI-FI","i":"/IMGCACHE/_1775/1775626_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-pro-rs-amd-x620a-4xddr5-1xhdmi-1xdp/product-1775629","n":"ASRock MB Sc AM5 A620AM PRO RS, AMD X620A, 4xDDR5, 1xHDMI, 1xDP","i":"/IMGCACHE/_1775/1775629_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-hvs-amd-a620a-2xddr5-1xhdmi/product-1776105","n":"ASRock MB Sc AM5 A620AM-HVS, AMD A620A, 2xDDR5, 1xHDMI","i":"/IMGCACHE/_1776/1776105_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-pro-a-amd-a620a-4xddr5-1xhdmi/product-1775632","n":"ASRock MB Sc AM5 A620AM PRO-A, AMD A620A, 4xDDR5, 1xHDMI","i":"/IMGCACHE/_1775/1775632_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-x-wifi-amd-a620a-2xddr5-1xhdmi-1xdp-wifi/product-1775636","n":"ASRock MB Sc AM5 A620AM-X WIFI, AMD A620A, 2xDDR5, 1xHDMI, 1xDP, WIFI","i":"/IMGCACHE/_1775/1775636_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-a620am-x-amd-a620a-2xddr5-1xhdmi-1xdp/product-1775639","n":"ASRock MB Sc AM5 A620AM-X, AMD A620A, 2xDDR5, 1xHDMI, 1xDP","i":"/IMGCACHE/_1775/1775639_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-pro-a-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi/product-1770493","n":"ASRock MB Sc AM5 X870 PRO-A WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI","i":"/IMGCACHE/_1770/1770493_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-riptide-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1767018","n":"ASRock MB Sc AM5 B850M Riptide WiFi, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1767/1767018_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-steel-legend-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1767024","n":"ASRock MB Sc AM5 B850M Steel Legend WiFi, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1767/1767024_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-h-intel-h810-2xddr5-1xhdmi-matx/product-1767028","n":"ASRock MB Sc LGA1851 H810M-H, Intel H810, 2xDDR5, 1xHDMI, mATX","i":"/IMGCACHE/_1767/1767028_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1700-b760i-lightning-wifi-intel-b760-2xddr5-1xdp-1xhdmi-mini-itx/product-1767030","n":"ASRock MB Sc LGA1700 B760I Lightning WiFi, Intel B760, 2xDDR5, 1xDP, 1xHDMI, mini-ITX","i":"/IMGCACHE/_1767/1767030_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-x-wifi-r2-0-amd-b850-2xddr5-1xdp-1xhdmi-wifi-matx/product-1760135","n":"ASRock MB Sc AM5 B850M-X WIFI R2.0, AMD B850, 2xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1760/1760135_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-b850m-x-r2-0-amd-b850-2xddr5-1xdp-1xhdmi-matx/product-1760136","n":"ASRock MB Sc AM5 B850M-X R2.0, AMD B850, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1760/1760136_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-h2-intel-b860-2xddr5-2xhdmi-matx/product-1755944","n":"ASRock MB Sc LGA1851 B860M-H2, Intel B860, 2xDDR5, 2xHDMI, mATX","i":"/IMGCACHE/_1755/1755944_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-x-intel-h810-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1755945","n":"ASRock MB Sc LGA1851 H810M-X, Intel H810, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1755/1755945_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-x-wifi-intel-h810-2xddr5-1xdp-1xhdmi-1xvga-wifi-matx/product-1755946","n":"ASRock MB Sc LGA1851 H810M-X WIFI, Intel H810, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, WiFi, mATX","i":"/IMGCACHE/_1755/1755946_0a_10.jpg"},
  {"h":"/asrock-mb-sc-am5-x870-challenger-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1826232","n":"ASRock MB Sc AM5 X870 Challenger WiFi, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1826/1826232_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-challenger-wifi-white-intel-b860-4xddr5-1xhdmi-wifi-matx/product-1826234","n":"ASRock MB Sc LGA1851 B860M Challenger WiFi WHITE, Intel B860, 4xDDR5,1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1826/1826234_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-b860m-challenger-wifi-intel-b860-4xddr5-1xhdmi-wifi-matx/product-1826235","n":"ASRock MB Sc LGA1851 B860M Challenger WiFi, Intel B860, 4xDDR5,1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1826/1826235_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-p-gen5-intel-h810-2xddr5-1xdp-1xhdmi-matx/product-1826236","n":"ASRock MB Sc LGA1851 H810M-P Gen5, Intel H810, 2xDDR5,1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1826/1826236_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-x-gen5-wifi-intel-h810-2xddr5-1xdp-1xhdmi-wifi-matx/product-1804207","n":"ASRock MB Sc LGA1851 H810M-X Gen5 WiFi, Intel H810, 2xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1804/1804207_0a_10.jpg"},
  {"h":"/asrock-mb-sc-lga1851-h810m-x-gen5-intel-h810-2xddr5-1xdp-1xhdmi-matx/product-1804211","n":"ASRock MB Sc LGA1851 H810M-X Gen5, Intel H810, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1804/1804211_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b660m-a-d4-csm-intel-b660-4xddr4-2xhdmi-1xdp-matx/product-1827979","n":"ASUS MB Sc LGA1700 PRIME B660M-A D4-CSM, Intel B660, 4xDDR4, 2xHDMI, 1xDP, mATX","i":"/IMGCACHE/_1827/1827979_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b660m-e-d4-intel-b660-4xddr4-1xhdmi-1xdp-matx/product-1827980","n":"ASUS MB Sc LGA1700 TUF GAMING B660M-E D4, Intel B660, 4xDDR4, 1xHDMI, 1xDP, mATX","i":"/IMGCACHE/_1827/1827980_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-2006-amd-x870e-4xddr5-wifi-1xhdmi-2xusb4/product-1829907","n":"ASUS MB Sc AM5 ROG CROSSHAIR 2006, AMD X870E, 4xDDR5, WiFi, 1xHDMI, 2xUSB4","i":"/IMGCACHE/_1829/1829907_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850m-plus-wifi7-amd-b850-4xddr5-wifi-1xdp-1xhdmi-matx/product-1839038","n":"ASUS MB Sc AM5 TUF GAMING B850M-PLUS WIFI7, AMD B850, 4xDDR5, WiFi, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1839/1839038_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850-e-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1756040","n":"ASUS MB Sc AM5 TUF GAMING B850-E WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1756/1756040_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-b850-max-gaming-wifi-w-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1756041","n":"ASUS MB Sc AM5 B850 MAX GAMING WIFI W, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1756/1756041_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b850-plus-csm-amd-b850-4xddr5-1xdp-1xhdmi-atx/product-1756042","n":"ASUS MB Sc AM5 PRIME B850-PLUS-CSM, AMD B850, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1756/1756042_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-pro-q870m-c-csm-intel-q870-4xddr5-2xdp-1xhdmi-matx/product-1757852","n":"ASUS MB Sc LGA1851 PRO Q870M-C-CSM, Intel Q870, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1757/1757852_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-wifi-ii-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1752644","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS WIFI II, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1752/1752644_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-apex-amd-x870-2xddr5-2xusb4-wifi/product-1756055","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E APEX, AMD X870, 2xDDR5, 2xUSB4, WiFi","i":"/IMGCACHE/_1756/1756055_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-extreme-amd-x870-4xddr5-1xhdmi-2xusb4-wifi-e-atx/product-1756056","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E EXTREME, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi, E-ATX","i":"/IMGCACHE/_1756/1756056_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-b850m-max-gaming-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1762053","n":"ASUS MB Sc AM5 B850M MAX GAMING WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1762/1762053_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850m-e-wifi-amd-b850-4xddr5-2xdp-1xhdmi-wifi-matx/product-1762054","n":"ASUS MB Sc AM5 TUF GAMING B850M-E WIFI, AMD B850, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1762/1762054_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850-btf-wifi-w-amd-b850-4xddr5-1xdp-1xhdmi-wifi/product-1762055","n":"ASUS MB Sc AM5 TUF GAMING B850-BTF WIFI W, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1762/1762055_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650e-e-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1757870","n":"ASUS MB Sc AM5 TUF GAMING B650E-E WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1757/1757870_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-x870-max-gaming-wifi7-amd-x870-4xddr5-2xusb4-1xhdmi-wifi/product-1757871","n":"ASUS MB Sc AM5 X870 MAX GAMING WIFI7, AMD X870, 4xDDR5, 2xUSB4, 1xHDMI, WiFi","i":"/IMGCACHE/_1757/1757871_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-x870-max-gaming-wifi7-w-amd-x870-4xddr5-2xusb4-1xhdmi-wifi/product-1758029","n":"ASUS MB Sc AM5 X870 MAX GAMING WIFI7 W, AMD X870, 4xDDR5, 2xUSB4, 1xHDMI, WiFi","i":"/IMGCACHE/_1758/1758029_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b850-g-gaming-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1762057","n":"ASUS MB Sc AM5 ROG STRIX B850-G GAMING WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1762/1762057_0a_10.jpg"},
  {"h":"/asus-mb-pro-ws-w880-ace-se-intel-w880-4xddr5-1xthunderbolt-1xhdmi-1xvga/product-1762593","n":"ASUS MB PRO WS W880-ACE SE, Intel W880, 4xDDR5, 1xThunderbolt, 1xHDMI, 1xVGA","i":"/IMGCACHE/_1762/1762593_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-x870e-plus-wifi7-amd-x870e-4xddr5-2xusb-c-4-0-1xhdmi/product-1762595","n":"ASUS MB Sc AM5 TUF GAMING X870E-PLUS WIFI7, AMD X870E, 4xDDR5, 2xUSB-C 4.0, 1xHDMI","i":"/IMGCACHE/_1762/1762595_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-b860m-max-gaming-ax-intel-b860-4xddr5-1xdp-wifi-matx/product-1759576","n":"ASUS MB Sc LGA1851 B860M MAX GAMING AX, Intel B860, 4xDDR5, 1xDP, WiFi, mATX","i":"/IMGCACHE/_1759/1759576_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-pro-ws-b850m-ace-se-amd-b850-4xddr5-1xhdmi-1xdp-1xvga-matx/product-1777015","n":"ASUS MB Sc AM5 Pro WS B850M-ACE SE, AMD B850, 4xDDR5, 1xHDMI, 1xDP, 1xVGA, mATX","i":"/IMGCACHE/_1777/1777015_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-r-d4-intel-b760-2xddr4-1xhdmi-matx/product-1773490","n":"ASUS MB Sc LGA1700 PRIME B760M-R D4, Intel B760, 2xDDR4, 1xHDMI, mATX","i":"/IMGCACHE/_1773/1773490_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-maximus-z890-hero-btf-intel-z890-4xddr5-wifi-1xhdmi-2xthunderbolt/product-1775165","n":"ASUS MB Sc LGA1851 ROG MAXIMUS Z890 HERO BTF, Intel Z890, 4xDDR5, WiFi, 1xHDMI, 2xThunderbolt","i":"/IMGCACHE/_1775/1775165_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-h810m-k-intel-h810-2xddr5-1xhdmi-1xvga-matx/product-1796353","n":"ASUS MB Sc LGA1851 PRIME H810M-K, Intel H810, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1796/1796353_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-x870-pro-wifi7-w-neo-amd-x870-4xddr5-2xusb4-1xhdmi/product-1796578","n":"ASUS MB Sc AM5 TUF GAMING X870-PRO WIFI7 W NEO, AMD X870, 4xDDR5, 2xUSB4, 1xHDMI","i":"/IMGCACHE/_1796/1796578_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b850-a-gaming-wifi7-neo-amd-b850-4xddr5-1xhdmi/product-1796580","n":"ASUS MB Sc AM5 ROG STRIX B850-A GAMING WIFI7 NEO, AMD B850, 4xDDR5, 1xHDMI","i":"/IMGCACHE/_1796/1796580_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850-pro-wifi7-w-neo-amd-b850-4xddr5-1xhdmi-1xdp/product-1796581","n":"ASUS MB Sc AM5 TUF GAMING B850-PRO WIFI7 W NEO, AMD B850, 4xDDR5, 1xHDMI, 1xDP","i":"/IMGCACHE/_1796/1796581_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-dark-hero-amd-x870e-4xddr5-wifi-1xhdmi-2xusb4/product-1797041","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E DARK HERO, AMD X870E, 4xDDR5, WiFi, 1xHDMI, 2xUSB4","i":"/IMGCACHE/_1797/1797041_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-glacial-amd-x870e-2xddr5-wifi-2xusb4-e-atx/product-1797042","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E GLACIAL, AMD X870E, 2xDDR5, WiFi, 2xUSB4, E-ATX","i":"/IMGCACHE/_1797/1797042_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-a620m-f-gaming-wifi-amd-a620-2xddr5-1xhdmi-matx/product-1798008","n":"ASUS MB Sc AM5 A620M-F GAMING WIFI, AMD A620, 2xDDR5, 1xHDMI, mATX","i":"/IMGCACHE/_1798/1798008_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850m-plus-wifi7-w-amd-b850-4x-ddr5-1xdp1-1xhdmi-wifi-matx/product-1782470","n":"ASUS MB Sc AM5 TUF GAMING B850M-PLUS WIFI7 W, AMD B850, 4x DDR5, 1xDP1, 1xHDMI, WIFI, mATX","i":"/IMGCACHE/_1782/1782470_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-proart-b850-creator-wifi-neo-amd-b850-4xddr5-1xhdmi-1xdp-1xusb-c/product-1803807","n":"ASUS MB Sc AM5 ProArt B850-CREATOR WIFI NEO, AMD B850, 4xDDR5, 1xHDMI, 1xDP, 1xUSB-C","i":"/IMGCACHE/_1803/1803807_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-pro-q870i-c-csm-intel-q870-4xddr5-2xdp-1xhdmi-mini-itx/product-1793891","n":"ASUS MB Sc LGA1851 PRO Q870I-C-CSM, Intel Q870, 4xDDR5, 2xDP, 1xHDMI, Mini-ITX","i":"/IMGCACHE/_1793/1793891_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-h810m-e-csm-intel-h810-2xddr5-2xdp-1xhdmi-matx/product-1783636","n":"ASUS MB Sc LGA1851 PRIME H810M-E-CSM, Intel H810, 2xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1783/1783636_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-f-wifi-intel-b760-2xddr5-wifi-1xdp-1xhdmi-matx/product-1785855","n":"ASUS MB Sc LGA1700 PRIME B760M-F WIFI, Intel B760, 2xDDR5, WiFi, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1785/1785855_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-a620am-plus-wifi-4xddr5-2xdp-1xhdmi-matx/product-1778072","n":"ASUS MB Sc AM5 TUF GAMING A620AM-PLUS WIFI, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1778/1778072_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-a620am-k-2xddr5-1xdp-1xhdmi-matx/product-1778074","n":"ASUS MB Sc AM5 PRIME A620AM-K, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1778/1778074_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-x870e-h-gaming-wifi7-4xddr5-1xhdmi-2xthunderbolt-atx/product-1778357","n":"ASUS MB Sc AM5 ROG STRIX X870E-H GAMING WIFI7, 4xDDR5, 1xHDMI, 2xThunderbolt, ATX","i":"/IMGCACHE/_1778/1778357_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-hero-btf-4xddr5-wifi-1xhdmi-2xthunderbolt-atx/product-1778358","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E HERO BTF, 4xDDR5, WIFI, 1xHDMI, 2xThunderbolt, ATX","i":"/IMGCACHE/_1778/1778358_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b660m-a-wifi-ddr4-intel-b660-4xddr4-1xdp-2xhdmi-wi-fi-matx/product-1637980","n":"ASUS MB Sc LGA1700 PRIME B660M-A WIFI DDR4, Intel B660, 4xDDR4, 1xDP, 2xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1637/1637980_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b650e-e-gaming-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1638117","n":"ASUS MB Sc AM5 ROG STRIX B650E-E GAMING WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1638/1638117_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650m-plus-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1638614","n":"ASUS MB Sc AM5 TUF GAMING B650M-PLUS WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1638/1638614_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-h610m-c-csm-intel-h610-2xddr5-1xdp-1xhdmi-1xdvi-1xvga-matx/product-1617284","n":"ASUS MB Sc LGA1700 PRO H610M-C-CSM, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xDVI, 1xVGA, mATX","i":"/IMGCACHE/_1617/1617284_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-h610m-c-d4-csm-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1617288","n":"ASUS MB Sc LGA1700 PRO H610M-C D4-CSM, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1617/1617288_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-a-wifi-d4-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-wi-fi-matx/product-1628718","n":"ASUS MB Sc LGA1700 PRIME H610M-A WIFI D4, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, WI-FI, mATX","i":"/IMGCACHE/_1628/1628718_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-r-d4-si-intel-h610-2xddr4-1xhdmi-1xdvi-1xvga-matx/product-1630964","n":"ASUS MB Sc LGA1700 PRIME H610M-R D4-SI, Intel H610, 2xDDR4, 1xHDMI, 1xDVI, 1xVGA, mATX","i":"/IMGCACHE/_1630/1630964_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-k-ddr4-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1608220","n":"ASUS MB Sc LGA1700 PRIME H610M-K DDR4, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608220_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-e-ddr4-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1608222","n":"ASUS MB Sc LGA1700 PRIME H610M-E DDR4, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608222_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-a-ddr4-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1608234","n":"ASUS MB Sc LGA1700 PRIME H610M-A DDR4, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608234_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-d-ddr4-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1608400","n":"ASUS MB Sc LGA1700 PRIME H610M-D DDR4, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608400_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-a-ddr4-csm-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1608780","n":"ASUS MB Sc LGA1700 PRIME H610M-A DDR4-CSM, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608780_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-e-ddr4-csm-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1608781","n":"ASUS MB Sc LGA1700 PRIME H610M-E DDR4-CSM, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1608/1608781_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h770-plus-ddr4-intel-h770-4xddr4-1xdp-1xhdmi/product-1645377","n":"ASUS MB Sc LGA1700 PRIME H770-PLUS DDR4, Intel H770, 4xDDR4, 1xDP, 1xHDMI","i":"/IMGCACHE/_1645/1645377_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-a-gaming-wifi-d4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi/product-1645379","n":"ASUS MB Sc LGA1700 ROG STRIX B760-A GAMING WIFI D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1645/1645379_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-g-gaming-wifi-d4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi-matx/product-1645382","n":"ASUS MB Sc LGA1700 ROG STRIX B760-G GAMING WIFI D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1645/1645382_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-wifi-d4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi-matx/product-1645383","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS WIFI D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1645/1645383_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-d4-intel-b760-4xddr4-1xdp-1xhdmi-matx/product-1645384","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1645/1645384_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-d4-intel-b760-4xddr4-1xdp-2xhdmi-matx/product-1645386","n":"ASUS MB Sc LGA1700 PRIME B760M-A D4, Intel B760, 4xDDR4, 1xDP, 2xHDMI, mATX","i":"/IMGCACHE/_1645/1645386_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b650e-i-gaming-wifi-amd-b650-2xddr5-1xhdmi-wi-fi-mini-itx/product-1639147","n":"ASUS MB Sc AM5 ROG STRIX B650E-I GAMING WIFI, AMD B650, 2xDDR5, 1xHDMI, WI-FI, mini-ITX","i":"/IMGCACHE/_1639/1639147_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650-plus-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1639148","n":"ASUS MB Sc AM5 TUF GAMING B650-PLUS WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1639/1639148_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b650e-f-gaming-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1639144","n":"ASUS MB Sc AM5 ROG STRIX B650E-F GAMING WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1639/1639144_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-b760m-ct-csm-intel-b760-4xddr5-2xdp-1xhdmi-1xvga-matx/product-1666473","n":"ASUS MB Sc LGA1700 PRO B760M-CT-CSM, Intel B760, 4xDDR5, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1666/1666473_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650m-a-ii-amd-b650-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1662885","n":"ASUS MB Sc AM5 PRIME B650M-A II, AMD B650, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1662/1662885_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650m-e-wifi-amd-b650-4xddr5-2xdp-1xhdmi-matx/product-1661478","n":"ASUS MB Sc AM5 TUF GAMING B650M-E WIFI, AMD B650, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1661/1661478_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-a620-pro-wifi-amd-a620-4xddr5-1xhdmi-1xdp-atx/product-1661479","n":"ASUS MB Sc AM5 TUF GAMING A620-PRO WIFI, AMD A620, 4xDDR5, 1xHDMI, 1xDP, ATX","i":"/IMGCACHE/_1661/1661479_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-a620m-k-amd-a620-2xddr5-1xhdmi-1xvga-matx/product-1660531","n":"ASUS MB Sc AM5 PRIME A620M-K, AMD A620, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1660/1660531_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650m-k-amd-b650-2xddr5-1xvga-1xhdmi-matx/product-1660772","n":"ASUS MB Sc AM5 PRIME B650M-K, AMD B650, 2xDDR5, 1xVGA, 1xHDMI, mATX","i":"/IMGCACHE/_1660/1660772_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-pro-a620m-c-csm-amd-a620-2xddr5-1xhdmi-1xdp-1xvga-1xdvi-d-matx/product-1660529","n":"ASUS MB Sc AM5 Pro A620M-C-CSM, AMD A620, 2xDDR5, 1xHDMI, 1xDP, 1xVGA, 1xDVI-D, mATX","i":"/IMGCACHE/_1660/1660529_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-e-d4-intel-b760-4xddr4-1xdp-1xhdmi-matx/product-1657756","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-E D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1657/1657756_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-csm-intel-b760-4xddr5-1xdp-2xhdmi-matx/product-1657761","n":"ASUS MB Sc LGA1700 PRIME B760M-A-CSM, Intel B760, 4xDDR5, 1xDP, 2xHDMI, mATX","i":"/IMGCACHE/_1657/1657761_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-proart-b760-creator-d4-intel-b760-4xddr4-1xdp-1xhdmi/product-1647397","n":"ASUS MB Sc LGA1700 PROART B760-CREATOR D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI","i":"/IMGCACHE/_1647/1647397_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-ws-w680-ace-intel-w680-4xddr5-1xdp-1xhdmi-1xvga/product-1647575","n":"ASUS MB Sc LGA1700 PRO WS W680-ACE, Intel W680, 4xDDR5, 1xDP, 1xHDMI, 1xVGA","i":"/IMGCACHE/_1647/1647575_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650-plus-amd-b650-4xddr5-1xdp-1xhdmi/product-1639150","n":"ASUS MB Sc AM5 PRIME B650-PLUS, AMD B650, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1639/1639150_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650-plus-csm-amd-b650-4xddr5-1xdp-1xhdmi/product-1639151","n":"ASUS MB Sc AM5 PRIME B650-PLUS-CSM, AMD B650, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1639/1639151_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-a620m-plus-amd-a620-4xddr5-1xhdmi-2xdp-matx/product-1656348","n":"ASUS MB Sc AM5 TUF GAMING A620M-PLUS, AMD A620, 4xDDR5, 1xHDMI, 2xDP, mATX","i":"/IMGCACHE/_1656/1656348_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-a620m-plus-wifi-amd-a620-4xddr5-1xhdmi-2xdp-matx/product-1656349","n":"ASUS MB Sc AM5 TUF GAMING A620M-PLUS WIFI, AMD A620, 4xDDR5, 1xHDMI, 2xDP, mATX","i":"/IMGCACHE/_1656/1656349_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga4677-pro-ws-w790-ace-intel-w790-8xddr5-ceb/product-1651669","n":"ASUS MB Sc LGA4677 PRO WS W790-ACE, Intel W790, 8xDDR5, CEB","i":"/IMGCACHE/_1651/1651669_0a_10.jpg"},
  {"h":"/asus-mb-pro-ws-w790e-sage-se-intel-w790-8xddr5-1xvga-eeb/product-1655002","n":"ASUS MB PRO WS W790E-SAGE SE, Intel W790, 8xDDR5, 1xVGA, EEB","i":"/IMGCACHE/_1655/1655002_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b660m-plus-wifi-intel-b660-4xddr5-1xdp-1xhdmi-wifi-matx/product-1656302","n":"ASUS MB Sc LGA1700 TUF GAMING B660M-PLUS WIFI, Intel B660, 4xDDR5, 1xDP, 1xHDMI, WIFI, mATX","i":"/IMGCACHE/_1656/1656302_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-q670m-c-csm-intel-q670-4xddr5-2xdp-1xhdmi-matx/product-1684988","n":"ASUS MB Sc LGA1700 PRO Q670M-C-CSM, Intel Q670, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1684/1684988_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-proart-b760-creator-intel-b760-4xddr5-1xdp-1xhdmi/product-1684985","n":"ASUS MB Sc LGA1700 PROART B760-CREATOR, Intel B760, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1684/1684985_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760-plus-wifi-d4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi/product-1684970","n":"ASUS MB Sc LGA1700 TUF GAMING B760-PLUS WIFI D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1684/1684970_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-b760m-plus-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1684972","n":"ASUS MB Sc LGA1700 TUF GAMING B760M-PLUS WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1684/1684972_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760-plus-intel-b760-4xddr5-1xdp-1xhdmi-1xvga-atx/product-1684977","n":"ASUS MB Sc LGA1700 PRIME B760-PLUS, Intel B760, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, ATX","i":"/IMGCACHE/_1684/1684977_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760-plus-d4-intel-b760-4xddr4-1xdp-1xhdmi-1xvga/product-1684978","n":"ASUS MB Sc LGA1700 PRIME B760-PLUS D4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, 1xVGA","i":"/IMGCACHE/_1684/1684978_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-wifi-intel-b760-4xddr5-1xdp-2xhdmi-matx/product-1684979","n":"ASUS MB Sc LGA1700 PRIME B760M-A WIFI, Intel B760, 4xDDR5, 1xDP, 2xHDMI, mATX","i":"/IMGCACHE/_1684/1684979_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-wifi-d4-intel-b760-4xddr4-1xdp-2xhdmi-wi-fi-matx/product-1684980","n":"ASUS MB Sc LGA1700 PRIME B760M-A WIFI D4, Intel B760, 4xDDR4, 1xDP, 2xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1684/1684980_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-csm-intel-b760-4xddr5-1xdp-2xhdmi-matx/product-1684981","n":"ASUS MB Sc LGA1700 PRIME B760M-A-CSM, Intel B760, 4xDDR5, 1xDP, 2xHDMI, mATX","i":"/IMGCACHE/_1684/1684981_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b760m-a-ddr4-csm-intel-b760-4xddr4-1xdp-2xhdmi-matx/product-1684982","n":"ASUS MB Sc LGA1700 PRIME B760M-A DDR4 CSM, Intel B760, 4xDDR4, 1xDP, 2xHDMI, mATX","i":"/IMGCACHE/_1684/1684982_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-a-wifi-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1679725","n":"ASUS MB Sc LGA1700 PRIME H610M-A WiFi, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1679/1679725_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-r-si-intel-h610-2xddr5-1xhdmi-1xdp-1xvga-matx/product-1681670","n":"ASUS MB Sc LGA1700 PRIME H610M-R SI, Intel H610, 2xDDR5, 1xHDMI, 1xDP, 1xVGA, mATX","i":"/IMGCACHE/_1681/1681670_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650m-a-wifi-ii-amd-b650-4xddr5-1xdp-1xhdmi-1xvga-wi-fi-matx/product-1681740","n":"ASUS MB Sc AM5 PRIME B650M-A WIFI II, AMD B650, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, WI-FI, mATX","i":"/IMGCACHE/_1681/1681740_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-ws-w680m-ace-se-intel-w680-4xddr5-1xdp-1xhdmi-1xvga-1xmatx/product-1680271","n":"ASUS MB Sc LGA1700 PRO WS W680M-ACE SE, Intel W680, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, 1xmATX","i":"/IMGCACHE/_1680/1680271_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-g-gaming-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1684967","n":"ASUS MB Sc LGA1700 ROG STRIX B760-G GAMING WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1684/1684967_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-i-gaming-wifi-intel-b760-2xddr5-1xdp-1xhdmi-wi-fi-mini-itx/product-1684872","n":"ASUS MB Sc LGA1700 ROG STRIX B760-I GAMING WIFI, Intel B760, 2xDDR5, 1xDP, 1xHDMI, WI-FI, mini-ITX","i":"/IMGCACHE/_1684/1684872_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-tuf-gaming-h770-pro-wifi-intel-h770-4xddr5-1xdp-1xhdmi-wi-fi/product-1684961","n":"ASUS MB Sc LGA1700 TUF GAMING H770-PRO WIFI, Intel H770, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1684/1684961_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-rog-strix-b760-f-gaming-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi/product-1684964","n":"ASUS MB Sc LGA1700 ROG STRIX B760-F GAMING WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1684/1684964_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-b660-plus-d4-intel-b660-4xddr4-1xdp-1xhdmi-1xvga/product-1699709","n":"ASUS MB Sc LGA1700 PRIME B660-PLUS D4, Intel B660, 4xDDR4, 1xDP, 1xHDMI, 1xVGA","i":"/IMGCACHE/_1699/1699709_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b650-e-wifi-amd-b650-4xddr5-1xdp-1xhdmi-atx/product-1700806","n":"ASUS MB Sc AM5 TUF GAMING B650-E WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1700/1700806_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650m-r-amd-b650-2xddr5-1xhdmi-matx/product-1700807","n":"ASUS MB Sc AM5 PRIME B650M-R, AMD B650, 2xDDR5, 1xHDMI, mATX","i":"/IMGCACHE/_1700/1700807_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-prime-h610m-d-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1692408","n":"ASUS MB Sc LGA1700 PRIME H610M-D, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1692/1692408_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1700-pro-ws-w680-ace-ipmi-intel-w680-4xddr5-1xdp-1xhdmi-1xvga/product-1717902","n":"ASUS MB Sc LGA1700 PRO WS W680-ACE IPMI, Intel W680, 4xDDR5, 1xDP, 1xHDMI, 1xVGA","i":"/IMGCACHE/_1717/1717902_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-x870-p-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727535","n":"ASUS MB Sc AM5 PRIME X870-P WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727535_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-x870-p-amd-x870-4xddr5-1xhdmi-2xusb4/product-1727536","n":"ASUS MB Sc AM5 PRIME X870-P, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4","i":"/IMGCACHE/_1727/1727536_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-x870-f-gaming-wifi-amd-x870-4xddr5-1xdp-1xhdmi-1xusb4-wifi/product-1727684","n":"ASUS MB Sc AM5 ROG STRIX X870-F GAMING WIFI, AMD X870, 4xDDR5, 1xDP, 1xHDMI, 1xUSB4, WiFi","i":"/IMGCACHE/_1727/1727684_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-x870-a-gaming-wifi-amd-x870-4xddr5-1xdp-1xhdmi-2xusb4-wifi/product-1727685","n":"ASUS MB Sc AM5 ROG STRIX X870-A GAMING WIFI, AMD X870, 4xDDR5, 1xDP, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727685_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-crosshair-x870e-hero-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727686","n":"ASUS MB Sc AM5 ROG CROSSHAIR X870E HERO, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727686_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-proart-x870e-creator-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727687","n":"ASUS MB Sc AM5 PROART X870E-CREATOR WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727687_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-x870-plus-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727688","n":"ASUS MB Sc AM5 TUF GAMING X870-PLUS WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727688_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-x870e-e-gaming-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727689","n":"ASUS MB Sc AM5 ROG STRIX X870E-E GAMING WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727689_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-proart-z890-creator-wifi-intel-z890-4xddr5-1xdp-1xhdmi-3xthunderbolt-wi-fi-atx/product-1736600","n":"ASUS MB Sc LGA1851 PROART Z890-CREATOR WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 3xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1736/1736600_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-b860-f-gaming-wifi-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-atx/product-1738199","n":"ASUS MB Sc LGA1851 ROG STRIX B860-F GAMING WIFI, Intel B860, 4xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738199_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-b860-a-gaming-wifi-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-atx/product-1738200","n":"ASUS MB Sc LGA1851 ROG STRIX B860-A GAMING WIFI, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738200_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-b860-g-gaming-wifi-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-matx/product-1738201","n":"ASUS MB Sc LGA1851 ROG STRIX B860-G GAMING WIFI, Intel B860, 4xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738201_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-b860-i-gaming-wifi-intel-b860-2xddr5-1xthunderbolt-1xdp-1xhdmi-wifi-mini-itx/product-1738202","n":"ASUS MB Sc LGA1851 ROG STRIX B860-I GAMING WIFI, Intel B860, 2xDDR5, 1xThunderbolt, 1xDP, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1738/1738202_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-tuf-gaming-b860-plus-wifi-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-atx/product-1738203","n":"ASUS MB Sc LGA1851 TUF GAMING B860-PLUS WIFI, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738203_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-tuf-gaming-b860m-plus-wifi-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-matx/product-1738204","n":"ASUS MB Sc LGA1851 TUF GAMING B860M-PLUS WIFI, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738204_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-tuf-gaming-b860m-plus-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-matx/product-1738205","n":"ASUS MB Sc LGA1851 TUF GAMING B860M-PLUS, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1738/1738205_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-b860-plus-wifi-intel-b860-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738206","n":"ASUS MB Sc LGA1851 PRIME B860-PLUS WIFI, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738206_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-maximus-z890-extreme-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi-e-atx/product-1730572","n":"ASUS MB Sc LGA1851 ROG MAXIMUS Z890 EXTREME, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI, E-ATX","i":"/IMGCACHE/_1730/1730572_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-maximus-z890-apex-intel-z890-2xddr5-2xthunderbolt-wi-fi-atx/product-1730575","n":"ASUS MB Sc LGA1851 ROG MAXIMUS Z890 APEX, Intel Z890, 2xDDR5, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730575_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-maximus-z890-hero-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wi-fi-atx/product-1730577","n":"ASUS MB Sc LGA1851 ROG MAXIMUS Z890 HERO, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730577_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-z890-e-gaming-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi-atx/product-1730578","n":"ASUS MB Sc LGA1851 ROG STRIX Z890-E GAMING WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730578_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-z890-f-gaming-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi-atx/product-1730579","n":"ASUS MB Sc LGA1851 ROG STRIX Z890-F GAMING WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730579_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-rog-strix-z890-a-gaming-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi-atx/product-1730580","n":"ASUS MB Sc LGA1851 ROG STRIX Z890-A GAMING WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730580_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-tuf-gaming-z890-pro-wifi-intel-z890-4xddr5-1xdp-1xhdmi-2xthunderbolt-wi-fi-atx/product-1730582","n":"ASUS MB Sc LGA1851 TUF GAMING Z890-PRO WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 2xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730582_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-tuf-gaming-z890-plus-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-1xusb4-wi-fi-atx/product-1730584","n":"ASUS MB Sc LGA1851 TUF GAMING Z890-PLUS WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, 1xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1730/1730584_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-z890-p-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-wi-fi-atx/product-1730585","n":"ASUS MB Sc LGA1851 PRIME Z890-P WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, WI-FI, ATX","i":"/IMGCACHE/_1730/1730585_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-z890-p-intel-z890-4xddr5-1xdp-1xhdmi-1xusb4-atx/product-1730586","n":"ASUS MB Sc LGA1851 PRIME Z890-P, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xUSB4, ATX","i":"/IMGCACHE/_1730/1730586_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-z890m-plus-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xusb4-wi-fi-matx/product-1730587","n":"ASUS MB Sc LGA1851 PRIME Z890M-PLUS WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xUSB4, WI-FI, mATX","i":"/IMGCACHE/_1730/1730587_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-prime-b650-plus-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1730592","n":"ASUS MB Sc AM5 PRIME B650-PLUS WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1730/1730592_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-x870-i-gaming-wifi-amd-x870-2xddr5-1xhdmi-2xusb4-wifi-mini-itx/product-1727704","n":"ASUS MB Sc AM5 ROG STRIX X870-I GAMING WIFI, AMD X870, 2xDDR5, 1xHDMI, 2xUSB4, WiFi, Mini-ITX","i":"/IMGCACHE/_1727/1727704_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-b860m-a-wifi-intel-b860-4xddr5-2xdp-1xhdmi-wifi-matx/product-1738208","n":"ASUS MB Sc LGA1851 PRIME B860M-A WIFI, Intel B860, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738208_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-b860m-a-csm-intel-b860-4xddr5-2xdp-1xhdmi-matx/product-1738209","n":"ASUS MB Sc LGA1851 PRIME B860M-A-CSM, Intel B860, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1738/1738209_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-b860m-k-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1738210","n":"ASUS MB Sc LGA1851 PRIME B860M-K, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1738/1738210_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b850-e-gaming-wifi-amd-b850-4xddr5-1xusb4-1xdp-1xhdmi-wifi-atx/product-1738189","n":"ASUS MB Sc AM5 ROG STRIX B850-E GAMING WIFI, AMD B850, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738189_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b850-f-gaming-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738190","n":"ASUS MB Sc AM5 ROG STRIX B850-F GAMING WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738190_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/asus-mb-sc-am5-rog-strix-b850-a-gaming-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738191","n":"ASUS MB Sc AM5 ROG STRIX B850-A GAMING WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738191_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-rog-strix-b850-i-gaming-wifi-amd-b850-2xddr5-1xusb4-1xhdmi-wifi-mini-itx/product-1738192","n":"ASUS MB Sc AM5 ROG STRIX B850-I GAMING WIFI, AMD B850, 2xDDR5, 1xUSB4, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1738/1738192_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850-plus-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1738193","n":"ASUS MB Sc AM5 TUF GAMING B850-PLUS WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1738/1738193_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850m-plus-wifi-amd-b850-4xddr5-1xdp-1xhdmi-wifi-matx/product-1738194","n":"ASUS MB Sc AM5 TUF GAMING B850M-PLUS WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1738/1738194_0a_10.jpg"},
  {"h":"/asus-mb-sc-am5-tuf-gaming-b850m-plus-amd-b850-4xddr5-1xdp-1xhdmi-matx/product-1738195","n":"ASUS MB Sc AM5 TUF GAMING B850M-PLUS, AMD B850, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1738/1738195_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-h810m-a-wifi-2xddr5-1xdp-1xhdmi-wifi-matx/product-1741337","n":"ASUS MB Sc LGA1851 PRIME H810M-A WIFI, 2xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1741/1741337_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-prime-h810m-a-csm-2xddr5-1xdp-1xhdmi-matx/product-1741338","n":"ASUS MB Sc LGA1851 PRIME H810M-A-CSM, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1741/1741338_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-pro-ws-z890-ace-se-intel-z890-4xddr5-1xthunderbolt-1xhdmi-1xvga-atx/product-1741339","n":"ASUS MB Sc LGA1851 PRO WS Z890-ACE SE, Intel Z890, 4xDDR5, 1xThunderbolt, 1xHDMI, 1xVGA, ATX","i":"/IMGCACHE/_1741/1741339_0a_10.jpg"},
  {"h":"/asus-mb-sc-lga1851-pro-h810m-c-csm-2xddr5-1xdp-1xhdmi-1xvga-1xdvi-d-matx/product-1742103","n":"ASUS MB Sc LGA1851 PRO H810M-C-CSM, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, 1xDVI-D, mATX","i":"/IMGCACHE/_1742/1742103_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860-ds3h-intel-b860-4xddr5-1xdp-1xhdmi-atx/product-1742217","n":"GIGABYTE MB Sc LGA1851 B860 DS3H, Intel B860, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1742/1742217_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-h810m-gaming-wifi6-intel-h810-2xddr5-1xdp-1xhdmi-wifi-matx/product-1752936","n":"GIGABYTE MB Sc LGA1851 H810M GAMING WIFI6, Intel H810, 2xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1752/1752936_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-h810m-h-intel-h810-2xddr5-1xhdmi-1xvga-matx/product-1752937","n":"GIGABYTE MB Sc LGA1851 H810M H, Intel H810, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1752/1752937_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-h810m-s2h-intel-h810-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1752938","n":"GIGABYTE MB Sc LGA1851 H810M S2H, Intel H810, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1752/1752938_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860-aorus-elite-wifi7-ice-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-atx/product-1740687","n":"GIGABYTE MB Sc LGA1851 B860 AORUS ELITE WIFI7 ICE, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740687_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860-eagle-wifi6e-intel-b860-4xddr5-1xdp-1xhdmi-wifi-atx/product-1740688","n":"GIGABYTE MB Sc LGA1851 B860 EAGLE WIFI6E, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740688_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860-gaming-x-wifi6e-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-atx/product-1740689","n":"GIGABYTE MB Sc LGA1851 B860 GAMING X WIFI6E, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740689_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-aorus-elite-wifi6e-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-matx/product-1740690","n":"GIGABYTE MB Sc LGA1851 B860M AORUS ELITE WIFI6E, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1740/1740690_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-d3hp-intel-b860-4xddr5-1xdp-1xhdmi-matx/product-1740692","n":"GIGABYTE MB Sc LGA1851 B860M D3HP, Intel B860, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1740/1740692_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-ds3h-intel-b860-4xddr5-2xdp-1xhdmi-matx/product-1740693","n":"GIGABYTE MB Sc LGA1851 B860M DS3H, Intel B860, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1740/1740693_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-ds3h-wifi6e-intel-b860-4xddr5-2xdp-1xhdmi-wifi-matx/product-1740694","n":"GIGABYTE MB Sc LGA1851 B860M DS3H WIFI6E, Intel B860, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1740/1740694_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-eagle-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1740695","n":"GIGABYTE MB Sc LGA1851 B860M EAGLE, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1740/1740695_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-gaming-x-wifi6e-intel-b860-4xddr5-1xusb4-1xdp-1xhdmi-wifi-matx/product-1740696","n":"GIGABYTE MB Sc LGA1851 B860M GAMING X WIFI6E, Intel B860, 4xDDR5, 1xUSB4, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1740/1740696_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860-ds3h-wifi6e-intel-b860-4xddr5-1xdp-1xhdmi-wifi-atx/product-1740697","n":"GIGABYTE MB Sc LGA1851 B860 DS3H WIFI6E, Intel B860, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740697_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-eagle-wifi7-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1727715","n":"GIGABYTE MB Sc AM5 X870 EAGLE WIFI7, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727715_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-aorus-master-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727716","n":"GIGABYTE MB Sc AM5 X870E AORUS MASTER, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727716_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-aorus-pro-ice-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727737","n":"GIGABYTE MB Sc AM5 X870E AORUS PRO ICE, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727737_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-a-xtreme-ai-top-amd-x870-4xddr5-2xhdmi-2xusb4-wifi-eatx/product-1728089","n":"GIGABYTE MB Sc AM5 X870E A XTREME AI TOP, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi, EATX","i":"/IMGCACHE/_1728/1728089_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-gaming-wf6-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1728091","n":"GIGABYTE MB Sc AM5 X870 GAMING WF6, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1728/1728091_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870i-aorus-pro-ice-amd-x870-2xddr5-1xhdmi-1xusb4-wifi-mini-itx/product-1728092","n":"GIGABYTE MB Sc AM5 X870I AORUS PRO ICE, AMD X870, 2xDDR5, 1xHDMI, 1xUSB4, WiFi, Mini-ITX","i":"/IMGCACHE/_1728/1728092_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-a-elite-wf7-ice-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727691","n":"GIGABYTE MB Sc AM5 X870 A ELITE WF7 ICE, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727691_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-a-elite-wifi7-amd-x870-4xddr5-2xhdmi-2xusb4-wifi/product-1727692","n":"GIGABYTE MB Sc AM5 X870E A ELITE WIFI7, AMD X870, 4xDDR5, 2xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1727/1727692_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-d3hp-ddr4-intel-b760-4xddr4-1xdp-1xhdmi-1xvga-matx/product-1718194","n":"GIGABYTE MB Sc LGA1700 B760M D3HP DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1718/1718194_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-h-v2-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1718772","n":"GIGABYTE MB Sc LGA1700 H610M H V2, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1718/1718772_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-eagle-amd-b650-4xddr5-1xdp-1xhdmi/product-1725324","n":"GIGABYTE MB Sc AM5 B650 EAGLE, AMD B650, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1725/1725324_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-d3hp-intel-b760-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1730793","n":"GIGABYTE MB Sc LGA1700 B760M D3HP, Intel B760, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1730/1730793_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-elite-wifi7-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-wifi/product-1729828","n":"GIGABYTE MB Sc LGA1851 Z890 A ELITE WIFI7, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729828_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-elite-wf7-ice-intel-z890-4xddr5-1xdp-1xhdmi-1xthunderbolt-wifi/product-1729829","n":"GIGABYTE MB Sc LGA1851 Z890 A ELITE WF7 ICE, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729829_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-gaming-x-wifi7-intel-z890-4xddr5-1xdp-1xhdmi-1xusb4-wifi/product-1729831","n":"GIGABYTE MB Sc LGA1851 Z890 GAMING X WIFI7, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xUSB4, WiFi","i":"/IMGCACHE/_1729/1729831_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-eagle-intel-z890-4xddr5-1xhdmi-1xdp/product-1729833","n":"GIGABYTE MB Sc LGA1851 Z890 EAGLE, Intel Z890, 4xDDR5, 1xHDMI, 1xDP","i":"/IMGCACHE/_1729/1729833_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-ud-wifi6e-intel-z890-4xddr5-1xdp-1xusb4-wifi/product-1729834","n":"GIGABYTE MB Sc LGA1851 Z890 UD WIFI6E, Intel Z890, 4xDDR5, 1xDP, 1xUSB4, WiFi","i":"/IMGCACHE/_1729/1729834_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-xtreme-ai-top-intel-z890-4xddr5-3xthunderbolt-wifi-e-atx/product-1729819","n":"GIGABYTE MB Sc LGA1851 Z890 A XTREME AI TOP, Intel Z890, 4xDDR5, 3xThunderbolt, WiFi, E-ATX","i":"/IMGCACHE/_1729/1729819_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-master-ai-top-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wifi-e-atx/product-1729820","n":"GIGABYTE MB Sc LGA1851 Z890 A MASTER AI TOP, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WiFi, E-ATX","i":"/IMGCACHE/_1729/1729820_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-aorus-master-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wifi/product-1729822","n":"GIGABYTE MB Sc LGA1851 Z890 AORUS MASTER, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729822_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-aorus-pro-ice-intel-z890-4xddr5-1xhdmi-2xthunderbolt-wifi/product-1729824","n":"GIGABYTE MB Sc LGA1851 Z890 AORUS PRO ICE, Intel Z890, 4xDDR5, 1xHDMI, 2xThunderbolt, WiFi","i":"/IMGCACHE/_1729/1729824_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-ai-top-intel-z890-4xddr5-3xthunderbolt-1xhdmi-wi-fi-e-atx/product-1737566","n":"GIGABYTE MB Sc LGA1851 Z890 AI TOP, Intel Z890, 4xDDR5, 3xThunderbolt, 1xHDMI, WI-FI, E-ATX","i":"/IMGCACHE/_1737/1737566_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-ai-top-amd-b850-4xddr5-1xusb4-1xhdmi-wi-fi-atx/product-1737568","n":"GIGABYTE MB Sc AM5 B850 AI TOP, AMD B850, 4xDDR5, 1xUSB4, 1xHDMI, WI-FI, ATX","i":"/IMGCACHE/_1737/1737568_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890m-a-elite-wf7-ice-intel-z890-4xddr5-1xdp-1xhdmi-1xusb4-wifi-matx/product-1729837","n":"GIGABYTE MB Sc LGA1851 Z890M A ELITE WF7 ICE, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xUSB4, WiFi, mATX","i":"/IMGCACHE/_1729/1729837_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890m-gaming-x-intel-z890-4xddr5-2xdp-1xhdmi-matx/product-1729838","n":"GIGABYTE MB Sc LGA1851 Z890M GAMING X, Intel Z890, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1729/1729838_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-h-v3-ddr4-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1711541","n":"GIGABYTE MB Sc LGA1700 H610M H V3 DDR4, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1711/1711541_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-s2h-v2-intel-h610-2xddr5-2xdp-1xhdmi-1xvga-matx/product-1703535","n":"GIGABYTE MB Sc LGA1700 H610M S2H V2, Intel H610, 2xDDR5, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1703/1703535_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-s2h-v3-ddr4-intel-h610-2xddr4-2xdp-1xhdmi-1xvga-matx/product-1709616","n":"GIGABYTE MB Sc LGA1700 H610M S2H V3 DDR4, Intel H610, 2xDDR4, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1709/1709616_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-eagle-ax-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi-atx/product-1698747","n":"GIGABYTE MB Sc AM5 B650 EAGLE AX, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI, ATX","i":"/IMGCACHE/_1698/1698747_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-k-ddr4-intel-h610-2xddr4-1xhdmi-matx/product-1652214","n":"GIGABYTE MB Sc LGA1700 H610M K DDR4, Intel H610, 2xDDR4, 1xHDMI, mATX","i":"/IMGCACHE/_1652/1652214_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-s2h-v2-ddr4-intel-h610-2xddr4-1xdp-1xhdmi-1xdvi-1xvga-matx/product-1656999","n":"GIGABYTE MB Sc LGA1700 H610M S2H V2 DDR4, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xDVI, 1xVGA, mATX","i":"/IMGCACHE/_1656/1656999_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610i-ddr4-intel-h610-2xddr4-2xdp-1xhdmi-1xvga-mini-itx/product-1612196","n":"GIGABYTE MB Sc LGA1700 H610I DDR4, Intel H610, 2xDDR4, 2xDP, 1xHDMI, 1xVGA, mini-ITX","i":"/IMGCACHE/_1612/1612196_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-s2h-intel-h610-2xddr5-1xdp-1xhdmi-1xdvi-1xvga-matx/product-1660439","n":"GIGABYTE MB Sc LGA1700 H610M S2H, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xDVI, 1xVGA, mATX","i":"/IMGCACHE/_1660/1660439_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-h-ddr4-intel-b760-2xddr4-1xhdmi-1xvga-matx/product-1662060","n":"GIGABYTE MB Sc LGA1700 B760M H DDR4, Intel B760, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1662/1662060_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-ds3h-ddr4-intel-b760-4xddr4-1xdp-1xhdmi/product-1646446","n":"GIGABYTE MB Sc LGA1700 B760 DS3H DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI","i":"/IMGCACHE/_1646/1646446_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-ddr4-intel-b760-4xddr4-1xdp-1xhdmi/product-1646449","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI","i":"/IMGCACHE/_1646/1646449_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-ax-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi/product-1646451","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X AX, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1646/1646451_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-aorus-elite-ax-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1646453","n":"GIGABYTE MB Sc LGA1700 B760M AORUS ELITE AX, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1646/1646453_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-ds3h-ax-ddr4-intel-b760-4xddr4-2xdp-1xhdmi-wi-fi-matx/product-1646454","n":"GIGABYTE MB Sc LGA1700 B760M DS3H AX DDR4, Intel B760, 4xDDR4, 2xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1646/1646454_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-ds3h-ddr4-intel-b760-4xddr4-2xdp-1xhdmi-1xvga-matx/product-1646455","n":"GIGABYTE MB Sc LGA1700 B760M DS3H DDR4, Intel B760, 4xDDR4, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1646/1646455_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-gaming-ddr4-intel-b760-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1646457","n":"GIGABYTE MB Sc LGA1700 B760M GAMING DDR4, Intel B760, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX,","i":"/IMGCACHE/_1646/1646457_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-force-amd-b850-2xddr5-1xdp-1xhdmi-matx/product-1778652","n":"GIGABYTE MB Sc AM5 B850M FORCE, AMD B850, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1778/1778652_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-force-wifi6e-amd-b850-2xddr5-wifi-1xdp-1xhdmi-matx/product-1778654","n":"GIGABYTE MB Sc AM5 B850M FORCE WIFI6E, AMD B850, 2xDDR5, WIFI, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1778/1778654_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-b860m-eagle-v2-intel-b860-2xddr5-1xdp-1xhdmi-matx/product-1783867","n":"GIGABYTE MB Sc LGA1851 B860M EAGLE V2, Intel B860, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1783/1783867_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-a-pro-x-ice-amd-x870e-4xddr5-2x-usb-c-2xhdmi-atx/product-1791909","n":"GIGABYTE MB Sc AM5 X870E A PRO X ICE, AMD X870E, 4xDDR5, 2x USB-C, 2xHDMI, ATX","i":"/IMGCACHE/_1791/1791909_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-k-v2-intel-h610-2xddr5-dp-hdmi-matx/product-1785949","n":"GIGABYTE MB Sc LGA1700 H610M K V2, Intel H610, 2xDDR5, DP, HDMI, mATX","i":"/IMGCACHE/_1785/1785949_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-d4-gen5-intel-b760-1xhdmi-1xdp-4xddr4-atx/product-1794990","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X D4 GEN5, Intel B760, 1xHDMI, 1xDP, 4xDDR4, ATX","i":"/IMGCACHE/_1794/1794990_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-eagle-wf6e-ice-amd-b850-4xddr5-1xhdmi-2xdp-wifi-matx/product-1795006","n":"GIGABYTE MB Sc AM5 B850M EAGLE WF6E ICE, AMD B850, 4xDDR5, 1xHDMI, 2xDP, Wifi, mATX","i":"/IMGCACHE/_1795/1795006_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-d3h-wifi-ddr4-intel-h610-2xddr4-1xhdmi-wifi-matx/product-1795007","n":"GIGABYTE MB Sc LGA1700 H610M D3H WIFI DDR4,Intel H610, 2xDDR4, 1xHDMI, Wifi,mATX","i":"/IMGCACHE/_1795/1795007_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-d3w-intel-h610-2xddr5-1xdp-1xhdmi-matx/product-1795008","n":"GIGABYTE MB Sc LGA1700 H610M D3W, Intel H610, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1795/1795008_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-h610m-d3w-wifi6-intel-h610-2xddr5-1xhdmi-1xdp-wifi-matx/product-1795009","n":"GIGABYTE MB Sc LGA1700 H610M D3W WIFI6, Intel H610, 2xDDR5, 1xHDMI, 1xDP, Wifi, mATX","i":"/IMGCACHE/_1795/1795009_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-a-elite-x-ice-amd-x870-4xddr5-2xusb-c-2x-hdmi-wifi-atx/product-1795010","n":"GIGABYTE MB Sc AM5 X870 A ELITE X ICE, AMD X870, 4xDDR5, 2xUSB-C, 2x HDMI, Wifi, ATX","i":"/IMGCACHE/no_image/no_image_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-a-pro-x-amd-x870e-4xddr5-2xusb-c-2xhdmi-wifi-atx/product-1795011","n":"GIGABYTE MB Sc AM5 X870E A PRO X, AMD X870E, 4xDDR5, 2xUSB-C, 2xHDMI, Wifi, ATX","i":"/IMGCACHE/_1795/1795011_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870e-aero-x-wood-amd-x870e-4xddr5-2xusb-c-2xhdmi-wifi-atx/product-1795012","n":"GIGABYTE MB Sc AM5 X870E AERO X WOOD, AMD X870E. 4xDDR5, 2xUSB-C, 2xHDMI, Wifi, ATX","i":"/IMGCACHE/_1795/1795012_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870m-a-elite-wf7-amd-x870-4xddr5-2xusb-c-2xhdmi-wifi-matx/product-1795013","n":"GIGABYTE MB Sc AM5 X870M A ELITE WF7, AMD X870, 4xDDR5, 2xUSB-C, 2xHDMI, Wifi, mATX","i":"/IMGCACHE/_1795/1795013_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-g-x-ddr4-gen5-intel-b760-1x-hdmi-1xdp-4xddr4-matx/product-1794992","n":"GIGABYTE MB Sc LGA1700 B760M G X DDR4 GEN5, Intel B760, 1x HDMI, 1xDP, 4xDDR4, mATX","i":"/IMGCACHE/_1794/1794992_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-eagle-wf7-ice-amd-b850-4xddr5-1xhdmi-1xdp-wifi-atx/product-1795004","n":"GIGABYTE MB Sc AM5 B850 EAGLE WF7 ICE, AMD B850, 4xDDR5, 1xHDMI, 1xDP, Wifi, ATX","i":"/IMGCACHE/_1795/1795004_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-aorus-stealth-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1802601","n":"GIGABYTE MB Sc AM5 X870 AORUS STEALTH, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1802/1802601_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-ds3h-wifi6e-gen5-intel-b760-4xddr5-1xdp-1xhdmi-wifi/product-1772795","n":"GIGABYTE MB Sc LGA1700 B760 DS3H WIFI6E GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1772/1772795_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-gaming-x-wifi6e-gen5-intel-b760-4xddr5-1xdp-1xhdmi-wifi-matx/product-1772836","n":"GIGABYTE MB Sc LGA1700 B760M GAMING X WIFI6E GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1772/1772836_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-x870-aorus-stealth-ice-amd-x870-4xddr5-1xhdmi-2xusb4-wifi/product-1766356","n":"GIGABYTE MB Sc AM5 X870 AORUS STEALTH ICE, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WiFi","i":"/IMGCACHE/_1766/1766356_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-eagle-ice-amd-b850-4xddr5-1xdp-1xhdmi-atx/product-1770913","n":"GIGABYTE MB Sc AM5 B850 EAGLE ICE, AMD B850, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1770/1770913_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-h810m-k-intel-h810-2xddr5-1xdp-1xhdmi-matx/product-1770898","n":"GIGABYTE MB Sc LGA1851 H810M K, Intel H810, 2xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1770/1770898_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-wifi6e-gen5-intel-b760-4xddr5-1xdp-1xhdmi/product-1770902","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X WIFI6E GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1770/1770902_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-gen5-intel-b760-4xddr5-1xdp-1xhdmi/product-1770903","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1770/1770903_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-ds3h-gen5-intel-b760-4xddr5-1xdp-1xhdmi/product-1770904","n":"GIGABYTE MB Sc LGA1700 B760 DS3H GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1770/1770904_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-aorus-elite-wifi6e-gen5-intel-b760-4xddr5-1xdp-1xhdmi-matx/product-1770906","n":"GIGABYTE MB Sc LGA1700 B760M AORUS ELITE WIFI6E GEN5, Intel B760, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1770/1770906_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-ds3h-wifi6e-gen5-intel-b760-4xddr5-2xdp-1xhdmi-matx/product-1770907","n":"GIGABYTE MB Sc LGA1700 B760M DS3H WIFI6E GEN5, Intel B760, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1770/1770907_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760m-d3hp-wifi6-intel-b760-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1770908","n":"GIGABYTE MB Sc LGA1700 B760M D3HP WIFI6, Intel B760, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1770/1770908_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-gaming-x-ax-v2-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1699581","n":"GIGABYTE MB Sc AM5 B650 GAMING X AX V2, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1699/1699581_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-h810m-gaming-wifi6-gen5-intel-h810-2xddr5-wifi-1xdp-1xhdmi-matx/product-1840209","n":"GIGABYTE MB Sc LGA1851 H810M GAMING WIFI6 Gen5, Intel H810, 2xDDR5, WiFi, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1840/1840209_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-a-elite-wifi7-plus-intel-z890-4xddr5-wifi-1xusb4-1xdp/product-1840707","n":"GIGABYTE MB Sc LGA1851 Z890 A ELITE WIFI7 PLUS, Intel Z890, 4xDDR5, WiFi, 1xUSB4, 1xDP","i":"/IMGCACHE/_1840/1840707_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1851-z890-eagle-wifi7-plus-intel-z890-4xddr5-wifi-1xusb4-1xdp/product-1840708","n":"GIGABYTE MB Sc LGA1851 Z890 EAGLE WIFI7 PLUS, Intel Z890, 4xDDR5, WiFi, 1xUSB4, 1xDP","i":"/IMGCACHE/_1840/1840708_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650m-gaming-plus-wf-amd-b650-4xddr5-2xdp-1xhdmi-wifi-matx/product-1770698","n":"GIGABYTE MB Sc AM5 B650M GAMING PLUS WF, AMD B650, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1770/1770698_0a_10.jpg"}
);
RAW_ITEMS.push(
  {"h":"/gigabyte-mb-sc-am5-b650e-eagle-wf6e-amd-b650-1xhdmi-1xdp-4xddr5-atx/product-1794989","n":"GIGABYTE MB Sc AM5 B650E EAGLE WF6E, AMD B650, 1xHDMI, 1xDP, 4xDDR5, ATX","i":"/IMGCACHE/_1794/1794989_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga-1700-b760m-g-p-wifi-ddr4-intel-b760-1xhdmi-1xdp-4xddr4-matx/product-1794991","n":"GIGABYTE MB Sc LGA 1700 B760M G P WIFI DDR4, Intel B760, 1xHDMI, 1xDP, 4xDDR4, mATX","i":"/IMGCACHE/_1794/1794991_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b840-eagle-wf6e-amd-b840-4xddr5-wifi-dp-hdmi-atx/product-1785944","n":"GIGABYTE MB Sc AM5 B840 EAGLE WF6E, AMD B840, 4xDDR5, Wifi, DP, HDMI, ATX","i":"/IMGCACHE/_1785/1785944_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b840-gaming-x-wf6e-amd-b840-4xddr5-wifi-dp-hdmi-atx/product-1785945","n":"GIGABYTE MB Sc AM5 B840 GAMING X WF6E, AMD B840, 4xDDR5, WIFI, DP, HDMI, ATX","i":"/IMGCACHE/_1785/1785945_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-lga1700-b760-gaming-x-4xddr5-1xdp-1xhdmi/product-1651148","n":"GIGABYTE MB Sc LGA1700 B760 GAMING X, 4xDDR5, 1xDP, 1xHDMI","i":"/IMGCACHE/_1651/1651148_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-aorus-elite-ax-v2-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi/product-1703531","n":"GIGABYTE MB Sc AM5 B650 AORUS ELITE AX V2, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI","i":"/IMGCACHE/_1703/1703531_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650m-d3hp-ax-amd-b650-4xddr5-2xdp-1xhdmi-wifi-matx/product-1695379","n":"GIGABYTE MB Sc AM5 B650M D3HP AX, AMD B650, 4xDDR5, 2xDP, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1695/1695379_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650-a-elite-ax-ice-amd-b650-4xddr5-1xdp-1xhdmi-wifi/product-1696572","n":"GIGABYTE MB Sc AM5 B650 A ELITE AX ICE, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WiFi","i":"/IMGCACHE/_1696/1696572_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650e-aorus-stealth-ice-amd-b650-4xddr5-2x-hdmi-1xusb-c-wi-fi-e-atx/product-1718190","n":"GIGABYTE MB Sc AM5 B650E AORUS STEALTH ICE, AMD B650, 4xDDR5, 2x HDMI, 1xUSB-C, WI-FI, E-ATX","i":"/IMGCACHE/_1718/1718190_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650m-d3hp-amd-b650-4xddr5-2xdp-1xhdmi-matx/product-1684642","n":"GIGABYTE MB Sc AM5 B650M D3HP, AMD B650, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1684/1684642_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650m-s2h-amd-b650-2xddr5-1xdp-1xhdmi-1xd-sub-matx/product-1680270","n":"GIGABYTE MB Sc AM5 B650M S2H, AMD B650, 2xDDR5, 1xDP, 1xHDMI, 1xD-Sub, mATX","i":"/IMGCACHE/_1680/1680270_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650i-ax-amd-b650-2xddr5-1xdp-1xhdmi-wi-fi-mini-itx/product-1691214","n":"GIGABYTE MB Sc AM5 B650I AX, AMD B650, 2xDDR5, 1xDP, 1xHDMI, WI-FI, mini-ITX","i":"/IMGCACHE/_1691/1691214_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b650m-aorus-elite-ax-ice-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi-matx/product-1691221","n":"GIGABYTE MB Sc AM5 B650M AORUS ELITE AX ICE, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1691/1691221_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850i-aorus-pro-amd-b850-2xddr5-1xhdmi-wifi-mini-itx/product-1740698","n":"GIGABYTE MB Sc AM5 B850I AORUS PRO, AMD B850, 2xDDR5, 1xHDMI, WiFi, Mini-ITX","i":"/IMGCACHE/_1740/1740698_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-a-elite-wf7-amd-b850-4xddr5-1xdp-wifi-atx/product-1740678","n":"GIGABYTE MB Sc AM5 B850 A ELITE WF7, AMD B850, 4xDDR5, 1xDP, WiFi, ATX","i":"/IMGCACHE/_1740/1740678_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-a-elite-wf7-ice-amd-b850-4xddr5-1xdp-wifi-atx/product-1740679","n":"GIGABYTE MB Sc AM5 B850 A ELITE WF7 ICE, AMD B850, 4xDDR5, 1xDP, WiFi, ATX","i":"/IMGCACHE/_1740/1740679_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-eagle-wifi6e-amd-b850-4xddr5-1xdp-wifi-atx/product-1740680","n":"GIGABYTE MB Sc AM5 B850 EAGLE WIFI6E, AMD B850, 4xDDR5, 1xDP, WiFi, ATX","i":"/IMGCACHE/_1740/1740680_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-gaming-wf6-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1740681","n":"GIGABYTE MB Sc AM5 B850 GAMING WF6, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740681_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-a-elite-wf6e-ice-amd-b850-4xddr5-1xdp-wifi-matx/product-1740682","n":"GIGABYTE MB Sc AM5 B850M A ELITE WF6E ICE, AMD B850, 4xDDR5, 1xDP, WiFi, mATX","i":"/IMGCACHE/_1740/1740682_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850-gaming-x-wifi6e-amd-b850-4xddr5-1xdp-1xhdmi-wifi-atx/product-1740683","n":"GIGABYTE MB Sc AM5 B850 GAMING X WIFI6E, AMD B850, 4xDDR5, 1xDP, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740683_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-d3hp-amd-b850-4xddr5-2xdp-1xhdmi-matx/product-1740684","n":"GIGABYTE MB Sc AM5 B850M D3HP, AMD B850, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1740/1740684_0a_10.jpg"},
  {"h":"/gigabyte-mb-sc-am5-b850m-ds3h-amd-b850-4xddr5-2xdp-1xhdmi-matx/product-1740685","n":"GIGABYTE MB Sc AM5 B850M DS3H, AMD B850, 4xDDR5, 2xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1740/1740685_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-mag-b860-tomahawk-wifi-intel-b860-4xddr5-1xhdmi-1xdp-1xusb4-atx/product-1740431","n":"MSI MB Sc LGA1851 MAG B860 TOMAHAWK WIFI, Intel B860, 4xDDR5, 1xHDMI, 1xDP, 1xUSB4, ATX","i":"/IMGCACHE/_1740/1740431_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-b860-p-wifi-intel-b860-4xddr-wifi-1xthunderbolt-1xhdmi-1xdp-atx/product-1740432","n":"MSI MB Sc LGA1851 PRO B860-P WIFI, Intel B860, 4xDDR, WiFi, 1xThunderbolt, 1xHDMI, 1xDP, ATX","i":"/IMGCACHE/_1740/1740432_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-b860-p-intel-b860-4xddr5-1xthunderbolt-1xdp-1xhdmi-atx/product-1740433","n":"MSI MB Sc LGA1851 PRO B860-P, Intel B860, 4xDDR5, 1xThunderbolt,1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1740/1740433_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-b860-gaming-plus-wifi-intel-b860-4xddr5-wifi-1xdp-1xhdmi-1xusb4-atx/product-1740434","n":"MSI MB Sc LGA1851 B860 GAMING PLUS WIFI, Intel B860, 4xDDR5, WiFi, 1xDP, 1xHDMI, 1xUSB4, ATX","i":"/IMGCACHE/_1740/1740434_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-b860m-a-wifi-intel-b860-4xddr5-1xhdmi-1xdp-1xusb4-matx/product-1740435","n":"MSI MB Sc LGA1851 PRO B860M-A WIFI, Intel B860, 4xDDR5, 1xHDMI, 1xDP, 1xUSB4, mATX","i":"/IMGCACHE/_1740/1740435_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-b860m-gaming-plus-wifi-intel-b860-4xddr5-wifi-1xdp-1xhdmi-1xusb4-matx/product-1740436","n":"MSI MB Sc LGA1851 B860M GAMING PLUS WIFI, Intel B860, 4xDDR5, WiFi, 1xDP, 1xHDMI, 1xUSB4, mATX","i":"/IMGCACHE/_1740/1740436_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mpg-b850-edge-ti-wifi-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1740437","n":"MSI MB Sc AM5 MPG B850 EDGE TI WIFI, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740437_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-b850-tomahawk-max-wifi-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1740438","n":"MSI MB Sc AM5 MAG B850 TOMAHAWK MAX WIFI, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740438_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b850-gaming-plus-wifi-amd-b850-4xddr5-1xdp-wifi-atx/product-1740439","n":"MSI MB Sc AM5 B850 GAMING PLUS WIFI, AMD B850, 4xDDR5, 1xDP, WiFi, ATX","i":"/IMGCACHE/_1740/1740439_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b850-p-wifi-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1740440","n":"MSI MB Sc AM5 PRO B850-P WIFI, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740440_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b840-gaming-plus-wifi-amd-b840-4xddr5-1xhdmi-wifi-atx/product-1740441","n":"MSI MB Sc AM5 B840 GAMING PLUS WIFI, AMD B840, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740441_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-x870e-tomahawk-wifi-amd-x870e-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1740443","n":"MSI MB Sc AM5 MAG X870E TOMAHAWK WIFI, AMD X870E, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1740/1740443_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-mpg-x870e-edge-ti-wifi-amd-x870e-4xddr5-2xusb4-1xhdmi-wifi-atx/product-1740444","n":"MSI MB Sc AM5 MAG MPG X870E EDGE TI WIFI, AMD X870E, 4xDDR5, 2xUSB4, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1740/1740444_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-b760-p-ii-intel-b760-4xddr5-1xdp-1xhdmi-atx/product-1751995","n":"MSI MB Sc LGA1700 PRO B760-P II, Intel B760, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1751/1751995_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-a620m-b-amd-a620-2xddr5-1xhdmi-1xvga-matx/product-1742863","n":"MSI MB Sc AM5 PRO A620M-B, AMD A620, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1742/1742863_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-mag-z890-tomahawk-wifi-intel-z890-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1727389","n":"MSI MB Sc LGA1851 MAG Z890 TOMAHAWK WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1727/1727389_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-z890-gaming-plus-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xdp-type-c-wi-fi-atx/product-1727390","n":"MSI MB Sc LGA1851 Z890 GAMING PLUS WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xDP Type-C, WI-FI, ATX","i":"/IMGCACHE/_1727/1727390_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-z890-p-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xdp-type-c-wi-fi-atx/product-1727391","n":"MSI MB Sc LGA1851 PRO Z890-P WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xDP Type-C, WI-FI, ATX","i":"/IMGCACHE/_1727/1727391_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mpg-x870e-carbon-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1727392","n":"MSI MB Sc AM5 MPG X870E CARBON WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1727/1727392_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-x870-tomahawk-wifi-amd-x870-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1727394","n":"MSI MB Sc AM5 MAG X870 TOMAHAWK WIFI, AMD X870, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1727/1727394_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-z890-s-wifi-intel-z890-4xddr5-1xdp-1xhdmi-1xdp-type-c-wi-fi-atx/product-1727429","n":"MSI MB Sc LGA1851 PRO Z890-S WIFI, Intel Z890, 4xDDR5, 1xDP, 1xHDMI, 1xDP Type-C, WI-FI, ATX","i":"/IMGCACHE/_1727/1727429_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-mpg-z890-carbon-wifi-intel-z890-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1729812","n":"MSI MB Sc LGA1851 MPG Z890 CARBON WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1729/1729812_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-mpg-z890-edge-ti-wifi-intel-z890-4xddr5-1xhdmi-2xusb4-wi-fi-atx/product-1729813","n":"MSI MB Sc LGA1851 MPG Z890 EDGE TI WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1729/1729813_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-mpg-z890i-edge-ti-wifi-intel-z890-4xddr5-1xhdmi-2xusb4-wi-fi-m-itx/product-1729814","n":"MSI MB Sc LGA1851 MPG Z890I EDGE TI WIFI, Intel Z890, 4xDDR5, 1xHDMI, 2xUSB4, WI-FI, m-ITX","i":"/IMGCACHE/_1729/1729814_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b650-s-wifi-amd-b650-4xddr5-1xdp-1xhdmi-wi-fi-atx/product-1686957","n":"MSI MB Sc AM5 PRO B650-S WIFI, AMD B650, 4xDDR5, 1xDP, 1xHDMI, WI-FI, ATX","i":"/IMGCACHE/_1686/1686957_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-b760-gaming-plus-wifi-intel-b760-4xddr5-1xdp-1xhdmi-atx/product-1679703","n":"MSI MB Sc LGA1700 B760 GAMING PLUS WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1679/1679703_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-b760-p-ddr4-ii-intel-b760-4xddr4-1xdp-1xhdmi-atx/product-1696660","n":"MSI MB Sc LGA1700 PRO B760-P DDR4 II, Intel B760, 4xDDR4, 1xDP, 1xHDMI, ATX","i":"/IMGCACHE/_1696/1696660_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b650m-p-amd-b650-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1693607","n":"MSI MB Sc AM5 PRO B650M-P, AMD B650, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1693/1693607_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-b760m-gaming-plus-wifi-intel-b760-4xddr5-2xdp-2x-hdmi-matx/product-1699529","n":"MSI MB Sc LGA1700 B760M GAMING PLUS WIFI, Intel B760, 4xDDR5, 2xDP, 2x HDMI, mATX","i":"/IMGCACHE/_1699/1699529_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b650m-gaming-plus-wifi-amd-b650-4xddr5-1xdp-1x-hdmi-matx/product-1699530","n":"MSI MB Sc AM5 B650M GAMING PLUS WIFI, AMD B650, 4xDDR5, 1xDP, 1x HDMI, mATX","i":"/IMGCACHE/_1699/1699530_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-b760-p-wifi-ddr4-intel-b760-4xddr4-1xdp-1xhdmi-wi-fi-atx/product-1649776","n":"MSI MB Sc LGA1700 PRO B760-P WIFI DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, WI-FI, ATX","i":"/IMGCACHE/_1649/1649776_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mpg-x870i-edge-ti-evo-wifi-amd-b870-2xddr5-wifi-1xhdmi-mini-itx/product-1798781","n":"MSI MB Sc AM5 MPG X870I EDGE TI EVO WIFI, AMD B870, 2xDDR5, WiFi,1xHDMI, mini-ITX","i":"/IMGCACHE/_1798/1798781_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-b850-tomahawk-wifi-amd-b850-4xddr5-wifi-1xhdmi-atx/product-1798788","n":"MSI MB Sc AM5 MAG B850 TOMAHAWK WIFI, AMD B850, 4xDDR5, WiFi, 1xHDMI, ATX","i":"/IMGCACHE/_1798/1798788_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b840-s-evo-wifi6e-amd-b840-4xddr5-wifi-1xhdmi-atx/product-1798790","n":"MSI MB Sc AM5 PRO B840-S EVO WIFI6E, AMD B840, 4xDDR5, WiFi, 1xHDMI, ATX","i":"/IMGCACHE/_1798/1798790_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b850-s-wifi6e-amd-b850-4xddr5-wifi-1xhdmi-1xdp-atx/product-1798793","n":"MSI MB Sc AM5 PRO B850-S WIFI6E, AMD B850, 4xDDR5, WiFi, 1xHDMI, 1xDP, ATX","i":"/IMGCACHE/_1798/1798793_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-a620am-b-evo-amd-a620a-2xddr5-1xhdmi-1xvga-matx/product-1796374","n":"MSI MB Sc AM5 PRO A620AM-B EVO, AMD A620A, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1796/1796374_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b850m-p-wifi-amd-b850-4xddr5-1xdp-1xhdmi-matx/product-1796375","n":"MSI MB Sc AM5 PRO B850M-P WIFI, AMD B850, 4xDDR5, 1xDP, 1xHDMI, mATX","i":"/IMGCACHE/_1796/1796375_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b850-gaming-plus-wifi6e-amd-b850-4xddr5-1xdp-wifi-atx/product-1775570","n":"MSI MB Sc AM5 B850 GAMING PLUS WIFI6E, AMD B850, 4xDDR5, 1xDP, WiFi, ATX","i":"/IMGCACHE/_1775/1775570_0a_10.jpg"},
  {"h":"/msi-mb-sc-b850m-gaming-plus-wifi6e-amd-b850-4xddr5-1xhdmi-1xdp-wifi-matx/product-1777107","n":"MSI MB Sc B850M GAMING PLUS WIFI6E, AMD B850, 4xDDR5, 1xHDMI, 1xDP, WiFi, mATX","i":"/IMGCACHE/_1777/1777107_0a_10.jpg"},
  {"h":"/msi-mb-sc-mpg-b850i-edge-ti-wifi-amd-b850-2xddr5-1xhdmi-wifi-atx/product-1777110","n":"MSI MB Sc MPG B850I EDGE TI WIFI,AMD B850, 2xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1777/1777110_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-x870e-gaming-plus-wifi-amd-x870e-4xddr5-1xhdmi-1xusb4-wi-fi-atx/product-1763253","n":"MSI MB Sc AM5 X870E GAMING PLUS WIFI, AMD X870E, 4xDDR5, 1xHDMI, 1xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1763/1763253_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-x870e-p-wifi-amd-x870e-4xddr5-1xhdmi-1xusb4-wi-fi-atx/product-1763255","n":"MSI MB Sc AM5 PRO X870E-P WIFI, AMD X870E, 4xDDR5, 1xHDMI, 1xUSB4, WI-FI, ATX","i":"/IMGCACHE/_1763/1763255_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b840m-gaming-plus-wifi6e-amd-b840-4xddr5-1xhdmi-wi-fi-matx/product-1763256","n":"MSI MB Sc AM5 B840M GAMING PLUS WIFI6E, AMD B840, 4xDDR5, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1763/1763256_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b840m-p-wifi6e-amd-b840-4xddr5-1xhdmi-wi-fi-matx/product-1763257","n":"MSI MB Sc AM5 PRO B840M-P WIFI6E, AMD B840, 4xDDR5, 1xHDMI, WI-FI, mATX","i":"/IMGCACHE/_1763/1763257_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-pro-b840m-b-amd-b840-2xddr5-1xhdmi-1xvga-matx/product-1763258","n":"MSI MB Sc AM5 PRO B840M-B, AMD B840, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1763/1763258_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-b850m-mortar-wifi-amd-b850-4xddr5-1xhdmi-wifi-matx/product-1759158","n":"MSI MB Sc AM5 MAG B850M MORTAR WIFI, AMD B850, 4xDDR5, 1xHDMI, WiFi, mATX","i":"/IMGCACHE/_1759/1759158_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b650-gaming-wifi-amd-b650-2xddr5-wifi-1xhdmi-1xdp-matx/product-1840773","n":"MSI MB Sc AM5 B650 GAMING WIFI, AMD B650, 2xDDR5, WiFi, 1xHDMI, 1xDP, mATX","i":"/IMGCACHE/_1840/1840773_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-mag-b850-tomahawk-max-wifi-ii-amd-b850-4xddr5-1xhdmi-wifi-atx/product-1849415","n":"MSI MB Sc AM5 MAG B850 TOMAHAWK MAX WIFI II, AMD B850, 4xDDR5, 1xHDMI, WiFi, ATX","i":"/IMGCACHE/_1849/1849415_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1851-pro-b860m-p-wifi6e-intel-b860-4xddr5-wifi-2xdp-1xhdmi-1xvga-matx/product-1849418","n":"MSI MB Sc LGA1851 PRO B860M-P WIFI6E, Intel B860, 4xDDR5, WiFi, 2xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1849/1849418_0a_10.jpg"},
  {"h":"/msi-mb-sc-am5-b850-gaming-pro-wifi6e-amd-b850-4xddr5-wifi-1xhdmi-1xdp-atx/product-1827824","n":"MSI MB Sc AM5 B850 GAMING PRO WIFI6E, AMD B850, 4xDDR5, WiFi, 1xHDMI, 1xDP, ATX","i":"/IMGCACHE/_1827/1827824_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-h610m-e-intel-h610-2xddr5-1xhdmi-1xvga-matx/product-1770199","n":"MSI MB Sc LGA1700 PRO H610M-E, Intel H610, 2xDDR5, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1770/1770199_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-h610m-g-intel-h610-2xddr5-1xdp-1xhdmi-1xvga-matx/product-1609156","n":"MSI MB Sc LGA1700 PRO H610M-G, Intel H610, 2xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1609/1609156_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-h610m-g-ddr4-intel-h610-2xddr4-1xdp-1xhdmi-1xvga-matx/product-1609157","n":"MSI MB Sc LGA1700 PRO H610M-G DDR4, Intel H610, 2xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1609/1609157_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-b760m-p-intel-b760-4xddr5-1xdp-1xhdmi-1xvga-matx/product-1679705","n":"MSI MB Sc LGA1700 PRO B760M-P, Intel B760, 4xDDR5, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1679/1679705_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-b760m-p-ddr4-intel-b760-4xddr4-1xdp-1xhdmi-1xvga-matx/product-1681746","n":"MSI MB Sc LGA1700 PRO B760M-P DDR4, Intel B760, 4xDDR4, 1xDP, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1681/1681746_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-pro-h610m-e-ddr4-intel-h610-2xddr4-1xhdmi-1xvga-matx/product-1684499","n":"MSI MB Sc LGA1700 PRO H610M-E DDR4, Intel H610, 2xDDR4, 1xHDMI, 1xVGA, mATX","i":"/IMGCACHE/_1684/1684499_0a_10.jpg"},
  {"h":"/msi-mb-sc-lga1700-mag-b760-tomahawk-wifi-intel-b760-4xddr5-1xdp-1xhdmi-wi-fi-atx/product-1691837","n":"MSI MB Sc LGA1700 MAG B760 TOMAHAWK WIFI, Intel B760, 4xDDR5, 1xDP, 1xHDMI, WI-FI, ATX","i":"/IMGCACHE/_1691/1691837_0a_10.jpg"}
);

function isRealProduct(item) {
  return /\/product-\d+$/.test(item.h) && !/^BAZAR/i.test(item.n.trim());
}

// Longest/most-specific token first so "X870E"/"B650E"/"A620A" win over their shorter prefix
// ("X870"/"B650"/"A620") regardless of where either appears in the title.
const CHIPSET_TOKENS = [
  'X870E', 'X870', 'X670E', 'X670', 'B650E', 'B650', 'A620A', 'A620', 'B850', 'B840',
  'Z890', 'B860', 'H810', 'Q870', 'W880', 'B760', 'H770', 'Q670', 'W790', 'W680', 'B660', 'H610',
];

// Hand-estimated street price (EUR) and tier per chipset — see header comment. Roughly: entry
// Intel/AMD boards D, mainstream B760/B650/B860/B850 B-C, high-end X870/W790/W880 A, flagship
// X870E/Z890 S.
const CHIPSET_INFO = {
  H610: { price: 75, tier: 'D' },
  B660: { price: 95, tier: 'D' },
  A620: { price: 90, tier: 'D' },
  A620A: { price: 90, tier: 'D' },
  B840: { price: 100, tier: 'D' },
  H810: { price: 80, tier: 'D' },
  B760: { price: 115, tier: 'C' },
  B650: { price: 135, tier: 'C' },
  B860: { price: 130, tier: 'C' },
  H770: { price: 145, tier: 'C' },
  Q670: { price: 155, tier: 'C' },
  Q870: { price: 160, tier: 'C' },
  B650E: { price: 170, tier: 'B' },
  B850: { price: 155, tier: 'B' },
  W680: { price: 230, tier: 'B' },
  X670: { price: 240, tier: 'B' },
  X670E: { price: 290, tier: 'A' },
  X870: { price: 230, tier: 'A' },
  W880: { price: 520, tier: 'A' },
  W790: { price: 550, tier: 'A' },
  X870E: { price: 300, tier: 'S' },
  Z890: { price: 320, tier: 'S' },
};

function chipsetFor(name) {
  const upper = name.toUpperCase();
  return CHIPSET_TOKENS.find((t) => upper.includes(t)) ?? null;
}

function socketFor(name) {
  const lga = name.match(/LGA\d{3,4}/i);
  if (lga) return lga[0].toUpperCase().replace('LGA', 'LGA'); // normalize casing only
  if (/\bAM5\b/i.test(name)) return 'AM5';
  if (/\bAM4\b/i.test(name)) return 'AM4';
  return null;
}

function ramGenFor(name) {
  const m = name.match(/DDR([45])/i);
  return m ? Number(m[1]) : null;
}

function formFactorFor(name) {
  if (/\b(E-ATX|EATX|EEB|CEB)\b/i.test(name)) return 'E-ATX';
  if (/\bmini[\s-]?itx\b/i.test(name) || /\bm-?itx\b/i.test(name)) return 'Mini-ITX';
  if (/\bm[\s-]?atx\b/i.test(name)) return 'mATX';
  return 'ATX';
}

// Strips the raw listing title down to "<Brand> <Model>" — "ASRock MB Sc LGA1700 B760 PRO RS,
// Intel B760, 4xDDR5, 1xDP, 1xHDMI" (everything past the first comma is redundant with the specs
// this script derives separately) becomes "ASRock B760 PRO RS".
function cleanName(raw) {
  return raw
    .split(',')[0]
    .replace(/\bMB\s+Sc\s+(LGA\d{3,4}|AM5|AM4)\s+/i, '')
    .replace(/\bMB\s+Sc\s+/i, '')
    .replace(/\bMB\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function specsFor(name, chipset, socket, ramGen, formFactor) {
  const parts = [socket ?? chipset, ramGen ? `DDR${ramGen}` : null, formFactor];
  if (/wi[\s-]?fi/i.test(name)) parts.push('WiFi');
  if (/thunderbolt/i.test(name)) parts.push('Thunderbolt');
  return parts.filter(Boolean).join(' · ');
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

async function uploadImage(imgPath, name) {
  const bareImage = imgPath.replace(/_0a_\d+(\.jpg)$/i, '_0a$1');
  const res = await fetch(EDSYSTEM + bareImage);
  const bytes = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  if (!bytes) {
    // A handful of listings have no real photo (IMGCACHE/no_image placeholder) or no bare "_0a"
    // master — fall back to whatever thumbnail the listing itself used rather than failing the
    // whole row over a missing image.
    const fallback = await fetch(EDSYSTEM + imgPath);
    if (!fallback.ok) return null;
    const fallbackBytes = Buffer.from(await fallback.arrayBuffer());
    return uploadBytes(fallbackBytes, name);
  }
  return uploadBytes(bytes, name);
}

async function uploadBytes(bytes, name) {
  const path = `${slugify(name)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    console.error(`Upload failed for ${name}: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const apply = process.argv.includes('--apply');

const { data: existingRows, error: existingError } = await supabase.from('components').select('name').eq('category', 'mobo');
if (existingError) throw new Error(`Failed to read existing mobo rows: ${existingError.message}`);
const existingNames = new Set(existingRows.map((r) => r.name.trim().toLowerCase()));

const parsed = [];
const skippedNoChipset = [];
const seenNames = new Set();
for (const item of RAW_ITEMS.filter(isRealProduct)) {
  const name = cleanName(item.n);
  const nameKey = name.toLowerCase();
  if (seenNames.has(nameKey) || existingNames.has(nameKey)) continue;
  const chipset = chipsetFor(item.n);
  if (!chipset) {
    skippedNoChipset.push(item.n);
    continue;
  }
  const info = CHIPSET_INFO[chipset];
  const socket = socketFor(item.n);
  const ramGen = ramGenFor(item.n);
  const formFactor = formFactorFor(item.n);
  seenNames.add(nameKey);
  parsed.push({
    name,
    imgPath: item.i,
    chipset,
    socket,
    ramGen,
    formFactor,
    price: info.price,
    tier: info.tier,
    specs: specsFor(item.n, chipset, socket, ramGen, formFactor),
  });
}

console.log(`Parsed ${parsed.length} new motherboards (${skippedNoChipset.length} skipped — no recognized chipset token, ${RAW_ITEMS.length - parsed.length - skippedNoChipset.length} skipped as duplicate/BAZAR/non-product).`);
if (skippedNoChipset.length) {
  console.log('Skipped (no chipset match):', JSON.stringify(skippedNoChipset, null, 2));
}
console.log('Sample:', JSON.stringify(parsed.slice(0, 5), null, 2));

if (!apply) {
  console.log('\n(dry run — pass --apply to actually download images, upload them, and insert rows)');
  process.exit(0);
}

let inserted = 0;
for (const p of parsed) {
  const imageUrl = p.imgPath ? await uploadImage(p.imgPath, p.name) : null;
  const row = {
    category: 'mobo',
    name: p.name,
    price: p.price,
    specs: p.specs,
    tier: p.tier,
    socket: p.socket,
    form_factor: p.formFactor,
    ram_generation: p.ramGen,
    image_url: imageUrl,
    sort_order: 100,
  };
  const { error } = await supabase.from('components').insert(row);
  if (error) {
    console.error(`INSERT FAILED for ${p.name}: ${error.message}`);
    continue;
  }
  inserted++;
  if (inserted % 25 === 0) console.log(`Inserted ${inserted}/${parsed.length}...`);
}
console.log(`\nDone — inserted ${inserted}/${parsed.length} motherboards.`);
