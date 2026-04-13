# ChassisForge

AI-powered parametric robot chassis design explorer. Accelerates the early conceptual design phase by letting you interactively explore chassis configurations with real-time physics scoring and CAE analysis.

## Current Focus: Comni Box Design D

The default design is **Design D** — a 5"x5"x5" tabletop home assistant with a pop-up projector head:

- **Retracted**: sealed 127mm cube sits on a desk
- **Deployed**: head rises 50mm via linear actuator, then tilts 45° to project AR overlays or track a speaker

### Head (2" / 50mm)
- Kodak Luma 350 projector
- Pi Camera 3 Wide (120° FOV)
- SparkFun VL53L5CX ToF sensor
- LX-16A pan servo, MG996R tilt servo

### Base (3" / 76mm)
- Raspberry Pi 5 (8GB)
- ReSpeaker XVF3800 mic array
- Actuonix L12-50 linear actuator
- PCA9685 servo driver + power electronics

### CAE Analysis

Eight automated structural/thermal checks run against the design:

| Check | What it validates |
|-------|-------------------|
| Actuator Side Load | Bending moment on L12-50 rod under worst-case tilt+pan |
| Column Buckling | Euler buckling margin for 4mm rod at 50mm extension |
| Top Panel Slot Stress | Stress concentration at 76x76mm slot corners |
| Servo Mount Reaction | Reaction torques at servo screw mounts during pan reversal |
| Thermal Steady State | Head/base temps after 30 min projection (Luma 20W, Pi 8W) |
| Vibration / Resonance | Natural frequency of rod+head vs servo step rate |
| Base Stability | Tipping margin under worst-case pan+tilt, min base weight |
| Cable Fatigue | Bend radius and cycle life for cables through pan joint |

## Quick Start

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

## Tech Stack

- **Frontend**: React 18 + TypeScript (strict), Three.js via @react-three/fiber, Recharts, Tailwind CSS v4
- **State**: Zustand
- **3D**: Parametric box model with animated deploy sequence
- **Physics**: Client-side analytic scoring (CG, stability, power budget, mobility)
- **CAE**: Client-side structural/thermal analysis (buckling, stress, thermal, vibration)

## Deployment

- **Vercel**: auto-deploys from `main` — [chassisforge.vercel.app](https://chassisforge.vercel.app)
- **GitHub Pages**: deploys via GitHub Actions on push to `main`

## Project Structure

```
frontend/src/
  components/      # React UI + Three.js 3D components
    DesignDModel   # 3D popup box with animated deploy
    BOMPanel       # Bill of materials (16 items, expanded)
    DeployControls # Retracted/Deployed toggle buttons
    CAEDashboard   # 8 structural/thermal analysis cards
    Viewport       # Three.js canvas scene
  engine/          # Client-side physics & CAE
    physics.ts     # CG, stability, power, mobility calcs
    caeAnalysis.ts # Structural, thermal, vibration checks
  data/            # Component catalog + Design D config
    designD.ts     # BOM data + physical constants
    components.ts  # Sensor/motor/battery catalog
    defaults.ts    # Default params (Design D dimensions)
  store/           # Zustand state management
  types/           # TypeScript interfaces
```

## License

MIT
