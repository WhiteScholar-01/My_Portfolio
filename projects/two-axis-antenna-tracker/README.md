# Two-axis satellite antenna tracker

> Azimuth–elevation tracker for UHF satellite passes, built end to end at Orbitalink.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | In progress               |
| **Area**     | Embedded             |
| **Year**     | 2025                 |
| **Where**    | Orbitalink                  |
| **Tools**    | Fusion 360, Arduino, STM32, C++                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Fusion 360 chassis optimised for rigidity and low weight
- NEMA23 hybrid servos on HSD57 drivers with trapezoidal motion ramps
- EEPROM-saved parameters and a serial command protocol
- Now porting to STM32F411 as modular firmware

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/two-axis-antenna-tracker/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/two-axis-antenna-tracker/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
