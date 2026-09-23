# UHF Satellite Image Transfer & SDR Antenna Testing

> Developed and validated an end-to-end Software-Defined Radio (SDR) communication link at 435 MHz to facilitate wireless image transfer. The project involved designing BPSK modulation pipelines in GNU Radio and developing custom Python telemetry scripts.

|              |                        |
| ------------ | ---------------------- |
| **Status**   | In progress               |
| **Area**     | RF & antennas             |
| **Year**     | —                 |
| **Where**    | Orbitalink                  |
| **Tools**    | GNU Radio, RF Communications, Digital Signal Processing, Python, Telemetry, HackRF, RTL-SDR                 |

## Overview

_Write the longer story here: what problem this solves, why you built it this
way, and what you would change next time. Nothing in this file is read by the
website — it is your own working notebook for the project._

## What I did

- Designed transmit and receive flowgraphs in GNU Radio for 435 MHz UHF communication using HackRF and RTL-SDR hardware operating at 2 MS/s.
- Implemented a BPSK demodulation pipeline featuring root-raised cosine (RRC) filtering, Costas loop carrier recovery, and differential decoding.
- Developed an automated, multi-threaded Python monitoring script to parse incoming binary streams, lock onto frame headers (0xDEADBEEF), and extract payloads in real time.
- Conducted physical antenna testing by calculating live link metrics, including Effective Data Rate (kbps) and Bit Error Rate (BER), to validate signal integrity.

## Results

_Numbers, plots, measurements. What actually came out of it._

## Images

Put photos, screenshots and diagrams in [`images/`](images/) next to this file.

To show one on the website, set the `image` field for this project in
`data/projects.json` to:

```
projects/uhf-satellite-image-transfer-sdr-antenna-testing/images/your-file.jpg
```

Extra figures go in the same project's `gallery` array:

```json
"gallery": [
  { "src": "projects/uhf-satellite-image-transfer-sdr-antenna-testing/images/plot.png", "caption": "Step response" }
]
```

## Notes and references

-
