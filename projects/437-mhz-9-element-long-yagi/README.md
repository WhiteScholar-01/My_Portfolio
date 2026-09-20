# 437 MHz 9-element long-Yagi

> Nine-element DL6WU long-Yagi for the 70 cm band, designed to feed 50 Ω directly with only a 1:1 balun, and documented as a full construction manual.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | Completed               |
| **Area**     | RF & antennas             |
| **Year**     | 2026                 |
| **Where**    | Orbitalink                  |
| **Tools**    | Yagi, Antenna design, DL6WU                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Designed a 9-element Rothammel/DL6WU long-Yagi for 437 MHz: 1283 mm round-boom array of one reflector, a straight half-wave dipole and seven directors, calculated for 11.24 dBd (13.39 dBi) over 428–446 MHz
- Sized the driven element from theory rather than by trial: a 343 mm half-wave scaled by a 0.959 thickness-correction factor to two 164.6 mm halves across a 3.4 mm feed gap
- Eliminated the matching network by choosing a straight dipole over a folded one, putting the feedpoint near 50 Ω so only a 1:1 balun is needed instead of an impedance step-up
- Carried the boom diameter through the calculation as a design variable (d/λ = 0.007, D/λ = 0.015), so element lengths and the 51→216 mm progressive director spacing stay valid for the 10 mm round boom actually used
- Specified two balun routes against build volume: a field-buildable 6-turn coax choke, or a packaged Mini-Circuits ETC1-1-13TR for repeatable results across multiple units
- Wrote a 12-section construction manual covering ±0.3 mm cutting tolerance, a 5% element tuning reserve trimmed from D6/D7 first, VNA acceptance criteria at <1.3:1 SWR, and grounding and wind-loading requirements

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/437-mhz-9-element-long-yagi/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/437-mhz-9-element-long-yagi/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
