# Halley Art

An interactive fractal art viewer that visualizes root-finding basins using Halley's method on complex functions.

## What is Halley's Method?

Halley's method is a third-order root-finding algorithm that extends Newton's method by incorporating the second derivative. When applied to complex functions, it produces intricate fractal patterns at the boundaries between convergence basins for different roots.

## Features

- **Mathematical Functions**: Polynomials, trigonometric, hyperbolic, and exponential functions
- **Variety of Color Schemes**: Rainbow, fire, ocean, MATLAB-style HSV, and more
- **Gallery Presets**: Curated views showcasing stunning fractal patterns
- **Interactive Exploration**:
  - Click to zoom (2x normal, 1.2x with Shift)
  - Pan with arrow keys (25% normal, 5% with Shift)
  - Fullscreen mode
- **High-Resolution Export**: Up to 18,000 pixels for print-quality images
- **URL Sharing**: Share specific views via URL hash parameters
- **Resolution Presets**: Quick access to 2K, 4K, 8K, and 18K resolutions

## Usage

Open `index.html` in a web browser. No build step required.

### Controls

- **Click canvas**: Zoom in centered on click point
- **Arrow keys**: Pan view (Shift for fine control)
- **+/- keys**: Zoom in/out (Shift for fine control)
- **Gallery Presets**: Select from dropdown for instant artistic views
- **Resolution Slider**: Hover to preview values; click markers for standard resolutions
- **Download button**: Save current view as PNG

## Technical Details

- Built with Vue 3 Composition API (CDN-based, no build step)
- Styled with Tailwind CSS
- Complex number arithmetic for fractal generation
- Canvas-based rendering with progress tracking
- Aspect ratio preservation options: 1:1, 4:3, 16:9, 21:9, 9:16

## Gallery Highlights

- **Default View**: Classic z³ - 1 fractal with vibrant rainbow coloring
- **Frog**: Intricate organic structure in z⁵ - z² basin boundaries
- **Fireburst**: Explosive radial patterns in sin(z²) - 1
- **Deadhead**: Deep zoom into chaotic z⁵ + z - 1 boundaries

## License

MIT License via Carter Maslan
