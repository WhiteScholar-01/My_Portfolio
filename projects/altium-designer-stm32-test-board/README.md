# Altium Designer STM32 Test Board

> Designed a compact, custom STM32-based test board featuring USB-C power delivery, an onboard buck converter, and integrated motion sensing. The project was developed entirely in Altium Designer, utilizing hierarchical schematic design.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | Completed               |
| **Area**     | Other             |
| **Year**     | 2026                 |
| **Where**    | Self-directed                  |
| **Tools**    | —                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Structured a modular hardware design in Altium using top-level hierarchical block schematics for Power, Microcontroller, and Peripherals.
- Engineered a power delivery system utilizing a USB-C connector and an LTC3405ES6 buck converter to step down +5V to a stable +3.3V.
- Integrated an STM32F042G6U6 microcontroller running on a 24MHz external crystal oscillator.
- Interfaced a high-performance BMI088 Inertial Measurement Unit (IMU) via SPI and provided an external I2C expansion header.
- Optimized PCB footprint real estate by utilizing a zero-cost TC2030-IDC-NL "Tag-Connect" footprint for SWD programming and debugging.

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/altium-designer-stm32-test-board/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/altium-designer-stm32-test-board/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
