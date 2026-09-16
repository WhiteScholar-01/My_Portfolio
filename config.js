/* =================================================================
   SITE SETTINGS — the only file you need to edit to connect the database.
   Supabase → Project Settings → API → copy "Project URL" and "anon public" key.
   ================================================================= */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const OWNER_EMAIL = "saqibali1729@gmail.com";
export const IMAGE_BUCKET = "project-images";

export const CATEGORIES = ["Motor drives", "Power electronics", "Control", "Embedded", "RF & antennas", "Web", "Other"];

/* Shown when the database isn't connected yet, and imported from the admin page. */
export const STARTER_PROJECTS = [
  { title: "Five-phase IPMSM field-oriented control", year: "2026", category: "Motor drives", featured: true, published: true, sort_order: 1,
    summary: "Modelling and control of a five-phase interior permanent magnet synchronous motor, from Simulink to TI DSP hardware at IIT Ropar.",
    details: ["Dual-plane FOC with MTPA and voltage-limited flux weakening", "Loss-aware MTPA derived with Lagrange multipliers, solved by Newton–Raphson", "Direct torque control with 20-sector hysteresis switching and five-phase SVPWM", "ePWM generation on a TI C2000 DSP and gate driver testing"],
    tags: ["MATLAB", "Simulink", "FOC", "MTPA", "TI C2000"], image: "", code_url: "", demo_url: "" },
  { title: "Two-axis satellite antenna tracker", year: "2025", category: "Embedded", featured: false, published: true, sort_order: 2,
    summary: "Azimuth–elevation tracker for UHF satellite passes, built end to end at Orbitalink.",
    details: ["Fusion 360 chassis optimised for rigidity and low weight", "NEMA23 hybrid servos on HSD57 drivers with trapezoidal motion ramps", "EEPROM-saved parameters and a serial command protocol", "Now porting to STM32F411 as modular firmware"],
    tags: ["Fusion 360", "Arduino", "STM32", "C++"], image: "", code_url: "", demo_url: "" },
  { title: "435 MHz cross-Yagi antenna", year: "2025", category: "RF & antennas", featured: false, published: true, sort_order: 3,
    summary: "Circularly polarised antenna for amateur satellites, modelled in MMANA-GAL before building.",
    details: ["Feedpoint tuned to 36.4 Ω", "Two-stage phasing harness for circular polarisation", "S-band variant modelled"],
    tags: ["MMANA-GAL", "NEC", "UHF"], image: "", code_url: "", demo_url: "" },
  { title: "Adaptive PID for a high-inertia mount", year: "2025", category: "Control", featured: false, published: true, sort_order: 4,
    summary: "Adaptive controller that stabilises and precisely points a heavy antenna tracker, with AMU Innovation Foundation.",
    details: [], tags: ["Adaptive control", "System modelling"], image: "", code_url: "", demo_url: "" },
  { title: "Image downlink over software-defined radio", year: "", category: "RF & antennas", featured: false, published: true, sort_order: 5,
    summary: "Wavelet-based image compression on a Raspberry Pi Compute Module 4, transmitted with GNU Radio.",
    details: [], tags: ["CM4", "Python", "GNU Radio"], image: "", code_url: "", demo_url: "" },
  { title: "DC-DC boost converter", year: "", category: "Power electronics", featured: false, published: true, sort_order: 6,
    summary: "Simulink model analysing steady-state and transient response across duty cycles and loads.",
    details: [], tags: ["Simulink", "SMPS"], image: "", code_url: "", demo_url: "" },
  { title: "Weather dashboard", year: "", category: "Web", featured: false, published: true, sort_order: 7,
    summary: "Responsive app with live weather for any city and API error handling, deployed on Render.",
    details: [], tags: ["Node.js", "Axios", "JavaScript"], image: "", code_url: "", demo_url: "" }
];
