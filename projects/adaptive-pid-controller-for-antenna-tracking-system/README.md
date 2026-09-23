# Adaptive PID Controller for Antenna Tracking System

> Designed and implemented a dual-axis antenna tracking system using an Arduino Uno, AS5600 magnetic rotary encoders, and a custom PID controller. The system drives high-inertia 12V wiper motors with built-in safety features.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | Completed               |
| **Area**     | Control             |
| **Year**     | 2025                 |
| **Where**    | —                  |
| **Tools**    | Arduino, PID Control, C++, I2C, Motor Control, AS5600, Embedded Systems                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Engineered a distributed I²C sensor architecture using a PCA9548A multiplexer and BTS7960 H-bridge drivers for bidirectional motor control.
- Developed deterministic 50Hz control loop firmware with a custom ASCII command protocol, emergency stop, and 10-second stall timeout protections.
- Achieved a 3.7-second settling time for 90° steps and an average steady-state tracking error of 0.6° under no-load conditions.

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/adaptive-pid-controller-for-antenna-tracking-system/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/adaptive-pid-controller-for-antenna-tracking-system/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
