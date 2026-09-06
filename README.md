# XR Industrial Cell – VR/XR Multiplatform

Interactive industrial visualization developed with **A-Frame, WebXR, JavaScript and Blender**, designed to operate from a conventional desktop browser, a smartphone, immersive VR and immersive AR.

The project represents an industrial production cell containing an automated conveyor, processing station, control panel and an optimized 6R industrial robot CAD model.

The same web application adapts its interaction and visualization according to the platform being used.

---

## Live Demo

The latest public version is deployed using GitHub Pages:

https://dev9thiago.github.io/VR_XRMultiplataforma_7004219/

For the complete mobile WebXR experience, **Google Chrome on Android** is recommended.

---

## Repository

GitHub repository:

https://github.com/Dev9Thiago/VR_XRMultiplataforma_7004219

---

# Project Overview

The objective of this project is to develop a multiplatform XR industrial environment capable of operating from different visualization devices without requiring separate applications for each platform.

The application integrates:

- Desktop 3D visualization.
- Keyboard and mouse navigation.
- Smartphone orientation using IMU sensors.
- Accelerometer and rotation-rate monitoring.
- WebXR compatibility diagnostics.
- Immersive Virtual Reality.
- Immersive Augmented Reality.
- AR horizontal-surface detection.
- Complete industrial-cell placement in AR.
- Automated industrial conveyor simulation.
- Interactive industrial control panel.
- Processing actuator animation.
- CAD model visualization.
- CAD optimization for real-time web rendering.
- Automatic CAD centering on a display platform.
- GitHub Pages deployment through HTTPS.

The complete environment is implemented as a browser-based application using WebXR technologies.

---

# Final Industrial Environment

The final virtual environment contains two principal systems:

1. **Industrial conveyor cell**
2. **CAD model display station**

Both systems coexist inside the same XR environment.

The industrial cell contains:

- Conveyor belt.
- Three workpieces.
- Processing station.
- Vertical processing actuator.
- Industrial control panel.
- START control.
- STOP control.
- Emergency stop.
- RESET control.
- Status indicators.
- Safety posts.

The CAD display station contains an optimized 6R industrial robot model imported from an engineering CAD assembly.

---

# Industrial Process Simulation

The conveyor system is controlled by the custom A-Frame component implemented in:

```text
scripts/conveyor.js