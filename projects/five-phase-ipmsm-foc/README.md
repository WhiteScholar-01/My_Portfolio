# Five-phase IPMSM field-oriented control

> Modelling and control of a five-phase interior permanent magnet synchronous motor, from Simulink to TI DSP hardware at IIT Ropar.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | Completed               |
| **Area**     | Motor drives             |
| **Year**     | 2026                 |
| **Where**    | IIT Ropar                  |
| **Tools**    | MATLAB, Simulink, FOC, MTPA, TI C2000                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Dual-plane FOC with MTPA and voltage-limited flux weakening
- Loss-aware MTPA derived with Lagrange multipliers, solved by Newton–Raphson
- Direct torque control with 20-sector hysteresis switching and five-phase SVPWM
- ePWM generation on a TI C2000 DSP and gate driver testing

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/five-phase-ipmsm-foc/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/five-phase-ipmsm-foc/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
