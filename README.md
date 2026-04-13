# ChassisForge — Comni Box Design Explorer

Interactive parametric design tool for the **Comni Box**, a 5"×5"×5" tabletop home assistant with a pop-up projector head. Explore enclosure dimensions, materials, and component placement with real-time physics scoring and CAE structural/thermal analysis.

**Live:** [chassisforge.vercel.app](https://chassisforge.vercel.app)

## What is Comni Box?

When idle, Comni is a sealed 127mm cube on a desk. On activation, a 2" head rises via linear actuator, then pans ±90° and tilts ±45° to track a speaker or project AR overlays onto a surface.

```
RETRACTED (5"×5"×5")          DEPLOYED (5"×5"×7")
┌─────────────┐               ┌─────────────┐ ← head tilted 45°
│  [head]     │               │  Luma 350   │/
│  [base]     │               ├─────────────┤  ← 2" rise
│  Pi 5       │               │  Pi 5       │
│  actuator   │               │  actuator   │
└─────────────┘               └─────────────┘
```

### Head (2" / 51mm)
- Kodak Luma 350 pico projector (200g, 20W thermal)
- Pi Camera 3 Wide (120° FOV)
- SparkFun VL53L5CX ToF sensor (63° diagonal)
- LX-16A serial servo (pan), MG996R servo (tilt)

### Base (3" / 76mm)
- Raspberry Pi 5 (8GB)
- ReSpeaker XVF3800 mic array
- Actuonix L12-50-50-6-R linear actuator
- PCA9685 servo driver + power electronics (12V, 5V buck, 6V BEC)

### BOM
16 components, ~$638 total. Full list displayed in-app, expanded by default.

## Features

### Parametric Sliders (Left Panel)
All parameters update the 3D model, scores, and CAE analysis in real-time.

**Enclosure Dimensions:** box width/depth, base height, head height, wall thickness

**Material Selection:** PLA, PETG, ABS (3D print) · Plywood, Acrylic (laser cut) · Aluminum (CNC/sheet). Material choice affects yield strength, elastic modulus, thermal limits, and density — all feed into CAE.

**Structural / CAE Parameters:** base plate weight (anti-tipping ballast), slot fillet radius, slot width/depth, actuator rise distance

**Component Positions:** X/Y/Z position for all 12 physical BOM components (8 in base, 4 in head). Changes trigger interference checks and CG recalculation.

### 3D Viewport (Center)
- Interactive Three.js model of the popup box
- **Retracted / Deployed** buttons with smooth animated transition (rise then tilt)
- All components rendered as labeled color-coded bounding blocks
- CG marker with ground projection

### Device Scores (Right Panel)
Real-time metrics tuned for a stationary companion device:

| Score | What it measures |
|-------|-----------------|
| Total Mass | Enclosure + all components + base plate |
| Power Draw | Pi 5 + Luma + servos + sensors (electronics only) |
| Tip Stability | CG margin within base footprint (%) |
| Min Tip Angle | Degrees before device tips at worst-case pan |
| Head / Base Temp | Steady-state thermal under 20W + 8W dissipation |
| Actuator Margin | Side load margin on L12-50 rod (vs 40N limit) |
| Buckling Margin | Euler critical load vs applied load on 4mm rod |
| Slot Stress | Corner stress at neck slot (with SCF) |
| Natural Frequency | Rod+head system vs servo update rate |
| Cable Life | Estimated pan-joint cable fatigue cycles |

### CAE Analysis (Right Panel, below scores)
Eight structural/thermal checks with PASS/WARN/FAIL status. All reactive to slider params — changing material, dimensions, or fillet radius updates every check instantly.

| Check | Analysis Method |
|-------|----------------|
| Actuator Side Load | Bending moment from head CoG offset at worst tilt+pan |
| Column Buckling | Euler buckling for fixed-free 4mm steel rod |
| Top Panel Slot Stress | Peterson's SCF at slot corners, stress vs yield |
| Servo Mount Reaction | Inertial + gravity torques during pan reversal |
| Thermal Steady State | Natural convection model, head/base temps |
| Vibration / Resonance | Cantilever natural frequency vs servo step rate |
| Base Stability | Tipping moment balance, minimum base weight |
| Cable Fatigue | Bend radius and empirical cycle life at pan joint |

Results scale with material selection — aluminum shows much higher margins than PLA.

## Quick Start

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
npm run build  # production build to frontend/dist
```

## Tech Stack

- **Frontend:** React 18 + TypeScript (strict), Tailwind CSS v4
- **3D:** Three.js via @react-three/fiber + drei
- **Charts:** Recharts (mass budget pie chart)
- **State:** Zustand (single store, scores recompute on every param change)
- **Physics:** Client-side analytic scoring (<1ms per update)
- **CAE:** Client-side closed-form structural/thermal analysis

## Deployment

- **Vercel:** auto-deploys from `main` — [chassisforge.vercel.app](https://chassisforge.vercel.app)
- **GitHub Pages:** GitHub Actions workflow on push to `main`
  - Activate at: repo Settings → Pages → Source → GitHub Actions
  - URL: `https://phdev.github.io/chassisforge/`

## Project Structure

```
frontend/src/
├── components/
│   ├── DesignDModel.tsx      # 3D popup box with animated deploy
│   ├── DeployControls.tsx    # Retracted/Deployed toggle
│   ├── SliderPanel.tsx       # All parametric controls
│   ├── BOMPanel.tsx          # 16-item bill of materials
│   ├── ScoringDashboard.tsx  # Device-relevant score cards
│   ├── CAEDashboard.tsx      # 8 structural/thermal analysis cards
│   ├── MassBudgetChart.tsx   # Pie chart mass breakdown
│   ├── StabilityIndicator.tsx# Top-down CG + footprint SVG
│   ├── Viewport.tsx          # Three.js canvas
│   └── ComponentBlock.tsx    # Labeled 3D bounding box
├── engine/
│   ├── physics.ts            # Mass, CG, tipping, power, interference
│   ├── caeAnalysis.ts        # All 8 structural/thermal checks
│   ├── cgCalculator.ts       # Mass-weighted CG computation
│   ├── stabilityAnalysis.ts  # Support polygon + tip angle
│   └── interferenceCheck.ts  # AABB overlap detection
├── data/
│   ├── designD.ts            # BOM data + physical constants
│   ├── components.ts         # Sensor catalog (Pi Cam, ToF, etc.)
│   └── defaults.ts           # Default Comni Box params
├── store/
│   └── useDesignStore.ts     # Zustand: params + scores + deploy state
└── types/
    ├── chassis.ts            # ChassisParams, SimulationScores, materials
    └── components.ts         # Sensor, Motor, etc. interfaces
```

## License

MIT
