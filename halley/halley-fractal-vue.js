const { ref, reactive, computed, watch, watchEffect, onMounted, nextTick } = Vue;

const HalleyFractal = {
  setup() {
    const canvasRef = ref(null);
    const isInitialized = ref(false);

    // Valid options for security validation
    const VALID_FORMULAS = [
      'z³ - 1', 'z⁴ - 1', 'z⁵ - 1', 'z⁶ - 1', 'z⁷ - 1', 'z⁸ - 1', 'z¹² - 1',
      'z³ - 0.5', 'z⁴ - 2', 'z⁴ + z² - 1', 'z⁵ + z - 1', 'z³ - z', 'z⁵ - z²', 'z⁵ - z³', 'z⁶ + z³ - 1',
      'z³ + (0.3+0.5i)', 'z³ + (-0.2+0.8i)', 'z³ + (1+i)', 'z³ + (0.5+0.2i)', 'z⁴ + (0.2+0.4i)',
      '(z² + 1)/(z³ - 1)', '(z³ - 2)/(z - 1)',
      'sin(z)', 'cos(z) - 1', 'exp(z) - 1', 'sinh(z) - 1', 'z³ + sin(z)', 'sin(z)·exp(z) - 1', 'z⁴ + exp(-z)', 'sin(z²) - 1', 'z·exp(z) - 1'
    ];

    const VALID_COLOR_SCHEMES = [
      'rainbow', 'fire', 'ocean', 'neon', 'plasma', 'viridis', 'sunset', 'copper', 'aurora', 'cyberpunk', 'marin', 'grayscale', 'hsv-8', 'hsv-16', 'hsv-32'
    ];

    const VALID_ASPECT_RATIOS = ['1:1', '4:3', '16:9', '21:9', '9:16'];

    // Curated presets with interesting parameter combinations
    const PRESETS = {
      'default': {
        name: 'Default View',
        formula: 'z³ - 1',
        bounds: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
        aspectRatio: '1:1',
        colorScheme: 'rainbow',
        maxIter: 50,
        resolution: 300,
        desc: 'Classic threefold symmetry view'
      },
      'frog': {
        name: 'Frog',
        formula: 'z⁵ - z²',
        bounds: { minX: -0.6263950634, maxX: -0.4597957096, minY: -0.5324579177, maxY: -0.4387079177 },
        aspectRatio: '16:9',
        colorScheme: 'rainbow',
        maxIter: 30,
        resolution: 1100,
        desc: 'Intricate frog-like structure in zoomed basin boundary'
      },
      'fireburst': {
        name: 'Fireburst',
        formula: 'sin(z²) - 1',
        bounds: { minX: 0.0856043782, maxX: 0.1688848350, minY: -1.2730556074, maxY: -1.2261806074 },
        aspectRatio: '16:9',
        colorScheme: 'fire',
        maxIter: 50,
        resolution: 1200,
        desc: 'Explosive radial burst pattern with swirling detail'
      },
      'goofy': {
        name: 'Goofy',
        formula: 'z·exp(z) - 1',
        bounds: { minX: -2.4349296537, maxX: -2.1015963203, minY: -0.2447240259, maxY: 0.0886093074 },
        aspectRatio: '1:1',
        colorScheme: 'rainbow',
        maxIter: 50,
        resolution: 700,
        desc: 'Playful organic patterns in Lambert W function fractal'
      },
      'reach': {
        name: 'Reach',
        formula: 'z⁶ + z³ - 1',
        bounds: { minX: -0.7247869693, maxX: -0.7234868122, minY: -0.0007213406, maxY: 0.0000110813 },
        aspectRatio: '16:9',
        colorScheme: 'hsv-32',
        maxIter: 50,
        resolution: 1300,
        desc: 'Extreme close-up revealing intricate fractal tendrils'
      },
      'deadhead': {
        name: 'Deadhead',
        formula: 'z⁵ + z - 1',
        bounds: { minX: -0.6271252514, maxX: -0.6245201941, minY: 0.0002386781, maxY: 0.0017035218 },
        aspectRatio: '16:9',
        colorScheme: 'hsv-8',
        maxIter: 50,
        resolution: 1300,
        evenIterOnly: true,
        desc: 'Deep zoom into chaotic basin boundaries with vivid colors'
      },
      'miwok': {
        name: 'Miwok',
        formula: 'z⁵ + z - 1',
        bounds: { minX: -1.0134875006, maxX: 0.3205045942, minY: -0.3613636364, maxY: 0.3886363636 },
        aspectRatio: '16:9',
        colorScheme: 'marin',
        maxIter: 20,
        resolution: 900,
        evenIterOnly: true,
        desc: 'Marin County landscape colors in high-contrast fractal form'
      }
    };

    // Parse URL hash on initial load
    const getInitialState = () => {
      const defaults = {
        resolution: 300,
        formula: 'z³ - 1',
        maxIter: 50,
        colorScheme: 'rainbow',
        bounds: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
        aspectRatio: '1:1',
        evenIterOnly: false
      };

      if (typeof window === 'undefined') return defaults;

      try {
        const hash = window.location.hash.slice(1);
        if (!hash) return defaults;

        const params = new URLSearchParams(hash);

        // Validate and sanitize resolution (100-18000)
        const res = parseInt(params.get('res'));
        const resolution = (res && res >= 100 && res <= 18000) ? res : defaults.resolution;

        // Validate formula against whitelist
        const f = params.get('f') ? decodeURIComponent(params.get('f')) : defaults.formula;
        const formula = VALID_FORMULAS.includes(f) ? f : defaults.formula;

        // Validate and sanitize maxIter (10-200)
        const iter = parseInt(params.get('iter'));
        const maxIter = (iter && iter >= 10 && iter <= 200) ? iter : defaults.maxIter;

        // Validate colorScheme against whitelist
        const color = params.get('color');
        const colorScheme = VALID_COLOR_SCHEMES.includes(color) ? color : defaults.colorScheme;

        // Validate aspectRatio against whitelist
        const aspect = params.get('aspect');
        const aspectRatio = VALID_ASPECT_RATIOS.includes(aspect) ? aspect : defaults.aspectRatio;

        // Validate evenIterOnly (boolean)
        const evenParam = params.get('even');
        const evenIterOnly = evenParam === 'true' || evenParam === '1';

        // Validate and sanitize bounds (finite numbers only)
        const x1 = parseFloat(params.get('x1'));
        const x2 = parseFloat(params.get('x2'));
        const y1 = parseFloat(params.get('y1'));
        const y2 = parseFloat(params.get('y2'));

        const bounds = {
          minX: (Number.isFinite(x1) && Math.abs(x1) < 1e10) ? x1 : defaults.bounds.minX,
          maxX: (Number.isFinite(x2) && Math.abs(x2) < 1e10) ? x2 : defaults.bounds.maxX,
          minY: (Number.isFinite(y1) && Math.abs(y1) < 1e10) ? y1 : defaults.bounds.minY,
          maxY: (Number.isFinite(y2) && Math.abs(y2) < 1e10) ? y2 : defaults.bounds.maxY
        };

        return { resolution, formula, maxIter, colorScheme, aspectRatio, evenIterOnly, bounds };
      } catch (e) {
        console.warn('Invalid URL hash parameters, using defaults');
        return defaults;
      }
    };

    const initialState = getInitialState();

    // State
    const resolution = ref(initialState.resolution);
    const formula = ref(initialState.formula);
    const maxIter = ref(initialState.maxIter);
    const colorScheme = ref(initialState.colorScheme);
    const bounds = reactive(initialState.bounds);
    const aspectRatio = ref(initialState.aspectRatio);
    const evenIterOnly = ref(initialState.evenIterOnly);

    const isRendering = ref(false);
    const progress = ref(0);
    const isExporting = ref(false);

    // Resolution slider hover tooltip
    const resolutionHover = reactive({
      show: false,
      value: 0,
      x: 0,
      y: 0
    });

    // Max iterations slider hover tooltip
    const maxIterHover = reactive({
      show: false,
      value: 0,
      x: 0,
      y: 0
    });
    const showCopied = ref(false);
    const selectedPreset = ref('default');

    // Apply preset handler
    const applyPreset = (presetKey) => {
      const preset = PRESETS[presetKey];
      if (!preset) return;

      selectedPreset.value = presetKey;
      formula.value = preset.formula;
      Object.assign(bounds, preset.bounds);
      aspectRatio.value = preset.aspectRatio;
      colorScheme.value = preset.colorScheme;
      maxIter.value = preset.maxIter;
      if (preset.resolution) {
        resolution.value = preset.resolution;
      }
      evenIterOnly.value = preset.evenIterOnly || false;
    };

    // Calculate canvas dimensions based on aspect ratio
    const canvasDimensions = computed(() => {
      const ratios = {
        '1:1': { width: resolution.value, height: resolution.value },
        '4:3': { width: resolution.value, height: Math.round(resolution.value * 3 / 4) },
        '16:9': { width: resolution.value, height: Math.round(resolution.value * 9 / 16) },
        '21:9': { width: resolution.value, height: Math.round(resolution.value * 9 / 21) },
        '9:16': { width: Math.round(resolution.value * 9 / 16), height: resolution.value }
      };
      return ratios[aspectRatio.value] || ratios['1:1'];
    });

    // Adjust bounds when aspect ratio changes to prevent distortion
    watch(canvasDimensions, () => {
      const { width, height } = canvasDimensions.value;
      const canvasAspect = width / height;

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const currentRangeX = bounds.maxX - bounds.minX;
      const currentRangeY = bounds.maxY - bounds.minY;
      const currentAspect = currentRangeX / currentRangeY;

      // Only adjust if aspect ratios don't match (with small tolerance)
      if (Math.abs(currentAspect - canvasAspect) > 0.01) {
        let newRangeX, newRangeY;

        // Keep the larger dimension and adjust the smaller one
        if (canvasAspect > 1) {
          // Wider canvas - keep Y range, adjust X range
          newRangeY = currentRangeY;
          newRangeX = newRangeY * canvasAspect;
        } else {
          // Taller canvas - keep X range, adjust Y range
          newRangeX = currentRangeX;
          newRangeY = newRangeX / canvasAspect;
        }

        Object.assign(bounds, {
          minX: centerX - newRangeX / 2,
          maxX: centerX + newRangeX / 2,
          minY: centerY - newRangeY / 2,
          maxY: centerY + newRangeY / 2
        });
      }
    });

    // Update URL hash when state changes
    watch([formula, resolution, aspectRatio, maxIter, colorScheme, evenIterOnly, () => ({ ...bounds })], () => {
      if (!isInitialized.value) {
        isInitialized.value = true;
        return;
      }

      const params = new URLSearchParams();
      params.set('f', encodeURIComponent(formula.value));
      params.set('res', resolution.value.toString());
      params.set('aspect', aspectRatio.value);
      params.set('iter', maxIter.value.toString());
      params.set('color', colorScheme.value);
      if (evenIterOnly.value) {
        params.set('even', 'true');
      }
      params.set('x1', bounds.minX.toFixed(10));
      params.set('x2', bounds.maxX.toFixed(10));
      params.set('y1', bounds.minY.toFixed(10));
      params.set('y2', bounds.maxY.toFixed(10));

      const newHash = params.toString();
      if (window.location.hash.slice(1) !== newHash) {
        window.history.replaceState(null, '', `#${newHash}`);
      }
    });

    // Copy URL to clipboard
    const copyShareLink = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showCopied.value = true;
        setTimeout(() => showCopied.value = false, 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopied.value = true;
        setTimeout(() => showCopied.value = false, 2000);
      }
    };

    // Complex number operations
    const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
    const cSub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
    const cMul = (a, b) => ({
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re
    });
    const cDiv = (a, b) => {
      const denom = b.re * b.re + b.im * b.im;
      if (denom === 0) return { re: Infinity, im: Infinity };
      return {
        re: (a.re * b.re + a.im * b.im) / denom,
        im: (a.im * b.re - a.re * b.im) / denom
      };
    };
    const cPow = (z, n) => {
      let result = { re: 1, im: 0 };
      for (let i = 0; i < n; i++) {
        result = cMul(result, z);
      }
      return result;
    };

    // Complex trigonometric and exponential functions
    const cSin = (z) => ({
      re: Math.sin(z.re) * Math.cosh(z.im),
      im: Math.cos(z.re) * Math.sinh(z.im)
    });

    const cCos = (z) => ({
      re: Math.cos(z.re) * Math.cosh(z.im),
      im: -Math.sin(z.re) * Math.sinh(z.im)
    });

    const cExp = (z) => {
      const expRe = Math.exp(z.re);
      return {
        re: expRe * Math.cos(z.im),
        im: expRe * Math.sin(z.im)
      };
    };

    const cSinh = (z) => ({
      re: Math.sinh(z.re) * Math.cos(z.im),
      im: Math.cosh(z.re) * Math.sin(z.im)
    });

    const cCosh = (z) => ({
      re: Math.cosh(z.re) * Math.cos(z.im),
      im: Math.sinh(z.re) * Math.sin(z.im)
    });

    // Function definitions with their derivatives and descriptions
    const functions = {
      'z³ - 1': {
        f: (z) => cSub(cPow(z, 3), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Classic 3-fold symmetry; clean, well-defined basins'
      },
      'z⁴ - 1': {
        f: (z) => cSub(cPow(z, 4), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
        d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
        desc: 'Fourfold symmetry; crisp, stable attraction basins'
      },
      'z⁵ - 1': {
        f: (z) => cSub(cPow(z, 5), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 5, im: 0 }, cPow(z, 4)),
        d2f: (z) => cMul({ re: 20, im: 0 }, cPow(z, 3)),
        desc: 'Fivefold star-like patterns; more intricate boundaries'
      },
      'z⁶ - 1': {
        f: (z) => cSub(cPow(z, 6), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 6, im: 0 }, cPow(z, 5)),
        d2f: (z) => cMul({ re: 30, im: 0 }, cPow(z, 4)),
        desc: 'Sixfold symmetry; general n-symmetric basins'
      },
      'z⁷ - 1': {
        f: (z) => cSub(cPow(z, 7), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 7, im: 0 }, cPow(z, 6)),
        d2f: (z) => cMul({ re: 42, im: 0 }, cPow(z, 5)),
        desc: 'Sevenfold symmetry; good for exploring scaling'
      },
      'z⁸ - 1': {
        f: (z) => cSub(cPow(z, 8), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 8, im: 0 }, cPow(z, 7)),
        d2f: (z) => cMul({ re: 56, im: 0 }, cPow(z, 6)),
        desc: 'Eightfold symmetry; intricate radial patterns'
      },
      'z¹² - 1': {
        f: (z) => cSub(cPow(z, 12), { re: 1, im: 0 }),
        df: (z) => cMul({ re: 12, im: 0 }, cPow(z, 11)),
        d2f: (z) => cMul({ re: 132, im: 0 }, cPow(z, 10)),
        desc: 'Twelvefold symmetry; highly detailed radial structure'
      },
      'z³ - 0.5': {
        f: (z) => cSub(cPow(z, 3), { re: 0.5, im: 0 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Mildly broken symmetry; produces chaotic distortions'
      },
      'z⁴ - 2': {
        f: (z) => cSub(cPow(z, 4), { re: 2, im: 0 }),
        df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
        d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
        desc: 'Strong symmetry breaking; wide chaotic filaments'
      },
      'z⁴ + z² - 1': {
        f: (z) => cSub(cAdd(cPow(z, 4), cPow(z, 2)), { re: 1, im: 0 }),
        df: (z) => cAdd(cMul({ re: 4, im: 0 }, cPow(z, 3)), cMul({ re: 2, im: 0 }, z)),
        d2f: (z) => cAdd(cMul({ re: 12, im: 0 }, cPow(z, 2)), { re: 2, im: 0 }),
        desc: 'Complex basin boundaries with multiple attractors'
      },
      'z⁵ + z - 1': {
        f: (z) => cSub(cAdd(cPow(z, 5), z), { re: 1, im: 0 }),
        df: (z) => cAdd(cMul({ re: 5, im: 0 }, cPow(z, 4)), { re: 1, im: 0 }),
        d2f: (z) => cMul({ re: 20, im: 0 }, cPow(z, 3)),
        desc: 'Multiple competing roots; tangled, intricate boundaries'
      },
      'z³ - z': {
        f: (z) => cSub(cPow(z, 3), z),
        df: (z) => cSub(cMul({ re: 3, im: 0 }, cPow(z, 2)), { re: 1, im: 0 }),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Extra critical points; highly detailed dendritic structures'
      },
      'z⁵ - z²': {
        f: (z) => cSub(cPow(z, 5), cPow(z, 2)),
        df: (z) => cSub(cMul({ re: 5, im: 0 }, cPow(z, 4)), cMul({ re: 2, im: 0 }, z)),
        d2f: (z) => cSub(cMul({ re: 20, im: 0 }, cPow(z, 3)), { re: 2, im: 0 }),
        desc: 'Rich interactions between roots; very fine detail'
      },
      'z⁵ - z³': {
        f: (z) => cSub(cPow(z, 5), cPow(z, 3)),
        df: (z) => cSub(cMul({ re: 5, im: 0 }, cPow(z, 4)), cMul({ re: 3, im: 0 }, cPow(z, 2))),
        d2f: (z) => cSub(cMul({ re: 20, im: 0 }, cPow(z, 3)), cMul({ re: 6, im: 0 }, z)),
        desc: 'Intricate dendritic structures with rich detail'
      },
      'z⁶ + z³ - 1': {
        f: (z) => cSub(cAdd(cPow(z, 6), cPow(z, 3)), { re: 1, im: 0 }),
        df: (z) => cAdd(cMul({ re: 6, im: 0 }, cPow(z, 5)), cMul({ re: 3, im: 0 }, cPow(z, 2))),
        d2f: (z) => cAdd(cMul({ re: 30, im: 0 }, cPow(z, 4)), cMul({ re: 6, im: 0 }, z)),
        desc: 'Complex root layout; dense fractal features'
      },
      'z³ + (0.3+0.5i)': {
        f: (z) => cAdd(cPow(z, 3), { re: 0.3, im: 0.5 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Asymmetric, Julia-like basin patterns'
      },
      'z³ + (-0.2+0.8i)': {
        f: (z) => cAdd(cPow(z, 3), { re: -0.2, im: 0.8 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Strong asymmetry; chaotic microstructures'
      },
      'z³ + (1+i)': {
        f: (z) => cAdd(cPow(z, 3), { re: 1, im: 1 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'Highly distorted basins; dramatic asymmetry'
      },
      'z³ + (0.5+0.2i)': {
        f: (z) => cAdd(cPow(z, 3), { re: 0.5, im: 0.2 }),
        df: (z) => cMul({ re: 3, im: 0 }, cPow(z, 2)),
        d2f: (z) => cMul({ re: 6, im: 0 }, z),
        desc: 'General complex-parameter form; tunable chaos'
      },
      'z⁴ + (0.2+0.4i)': {
        f: (z) => cAdd(cPow(z, 4), { re: 0.2, im: 0.4 }),
        df: (z) => cMul({ re: 4, im: 0 }, cPow(z, 3)),
        d2f: (z) => cMul({ re: 12, im: 0 }, cPow(z, 2)),
        desc: 'Four-fold symmetry with complex asymmetry'
      },
      '(z² + 1)/(z³ - 1)': {
        f: (z) => cDiv(cAdd(cPow(z, 2), { re: 1, im: 0 }), cSub(cPow(z, 3), { re: 1, im: 0 })),
        df: (z) => {
          const num = cAdd(cPow(z, 2), { re: 1, im: 0 });
          const den = cSub(cPow(z, 3), { re: 1, im: 0 });
          const dnum = cMul({ re: 2, im: 0 }, z);
          const dden = cMul({ re: 3, im: 0 }, cPow(z, 2));
          return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
        },
        d2f: (z) => {
          // Numerical approximation for complex second derivative
          const h = 0.0001;
          const f = (w) => {
            const num = cAdd(cPow(w, 2), { re: 1, im: 0 });
            const den = cSub(cPow(w, 3), { re: 1, im: 0 });
            const dnum = cMul({ re: 2, im: 0 }, w);
            const dden = cMul({ re: 3, im: 0 }, cPow(w, 2));
            return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
          };
          const fp = f(cAdd(z, { re: h, im: 0 }));
          const fm = f(cSub(z, { re: h, im: 0 }));
          return cDiv(cSub(fp, fm), { re: 2 * h, im: 0 });
        },
        desc: 'Roots and poles compete, producing exotic tilings'
      },
      '(z³ - 2)/(z - 1)': {
        f: (z) => cDiv(cSub(cPow(z, 3), { re: 2, im: 0 }), cSub(z, { re: 1, im: 0 })),
        df: (z) => {
          const num = cSub(cPow(z, 3), { re: 2, im: 0 });
          const den = cSub(z, { re: 1, im: 0 });
          const dnum = cMul({ re: 3, im: 0 }, cPow(z, 2));
          const dden = { re: 1, im: 0 };
          return cDiv(cSub(cMul(dnum, den), cMul(num, dden)), cMul(den, den));
        },
        d2f: (z) => {
          const h = 0.0001;
          const df = (w) => {
            const num = cSub(cPow(w, 3), { re: 2, im: 0 });
            const den = cSub(w, { re: 1, im: 0 });
            const dnum = cMul({ re: 3, im: 0 }, cPow(w, 2));
            return cDiv(cSub(cMul(dnum, den), num), cMul(den, den));
          };
          const fp = df(cAdd(z, { re: h, im: 0 }));
          const fm = df(cSub(z, { re: h, im: 0 }));
          return cDiv(cSub(fp, fm), { re: 2 * h, im: 0 });
        },
        desc: 'Strong singularity at z=1; chaotic filaments'
      },
      'sin(z)': {
        f: (z) => cSin(z),
        df: (z) => cCos(z),
        d2f: (z) => cMul({ re: -1, im: 0 }, cSin(z)),
        desc: 'Infinite periodic zeros → repeating tile-like patterns'
      },
      'cos(z) - 1': {
        f: (z) => cSub(cCos(z), { re: 1, im: 0 }),
        df: (z) => cMul({ re: -1, im: 0 }, cSin(z)),
        d2f: (z) => cMul({ re: -1, im: 0 }, cCos(z)),
        desc: 'Zeros at multiples of 2π; repeating basin cells'
      },
      'exp(z) - 1': {
        f: (z) => cSub(cExp(z), { re: 1, im: 0 }),
        df: (z) => cExp(z),
        d2f: (z) => cExp(z),
        desc: 'Infinite zeros with exponential growth; self-similar structure'
      },
      'z³ + sin(z)': {
        f: (z) => cAdd(cPow(z, 3), cSin(z)),
        df: (z) => cAdd(cMul({ re: 3, im: 0 }, cPow(z, 2)), cCos(z)),
        d2f: (z) => cSub(cMul({ re: 6, im: 0 }, z), cSin(z)),
        desc: 'Blends polynomial basins with sinusoidal distortions'
      },
      'sin(z)·exp(z) - 1': {
        f: (z) => cSub(cMul(cSin(z), cExp(z)), { re: 1, im: 0 }),
        df: (z) => cMul(cAdd(cCos(z), cSin(z)), cExp(z)),
        d2f: (z) => cMul(cMul({ re: 2, im: 0 }, cCos(z)), cExp(z)),
        desc: 'Highly organic branching patterns; complex interference structure'
      },
      'z⁴ + exp(-z)': {
        f: (z) => cAdd(cPow(z, 4), cExp(cMul({ re: -1, im: 0 }, z))),
        df: (z) => cSub(cMul({ re: 4, im: 0 }, cPow(z, 3)), cExp(cMul({ re: -1, im: 0 }, z))),
        d2f: (z) => cAdd(cMul({ re: 12, im: 0 }, cPow(z, 2)), cExp(cMul({ re: -1, im: 0 }, z))),
        desc: 'Polynomial growth vs. exponential decay; unusual textures'
      },
      'sin(z²) - 1': {
        f: (z) => cSub(cSin(cPow(z, 2)), { re: 1, im: 0 }),
        df: (z) => cMul(cMul({ re: 2, im: 0 }, z), cCos(cPow(z, 2))),
        d2f: (z) => {
          const z2 = cPow(z, 2);
          const cos_z2 = cCos(z2);
          const sin_z2 = cSin(z2);
          const term1 = cMul({ re: 2, im: 0 }, cos_z2);
          const term2 = cMul(cMul({ re: -4, im: 0 }, cPow(z, 2)), sin_z2);
          return cAdd(term1, term2);
        },
        desc: 'Curved, chaotic zero sets; swirling fractal structures'
      },
      'sinh(z) - 1': {
        f: (z) => cSub(cSinh(z), { re: 1, im: 0 }),
        df: (z) => cCosh(z),
        d2f: (z) => cSinh(z),
        desc: 'Hyperbolic symmetries; different structure from trig functions'
      },
      'z·exp(z) - 1': {
        f: (z) => cSub(cMul(z, cExp(z)), { re: 1, im: 0 }),
        df: (z) => cAdd(cExp(z), cMul(z, cExp(z))),
        d2f: (z) => cAdd(cMul({ re: 2, im: 0 }, cExp(z)), cMul(z, cExp(z))),
        desc: 'Lambert W function related; exotic mixed patterns'
      }
    };

    // Color schemes
    const getColor = (iterations, maxIterValue, scheme) => {
      if (iterations >= maxIterValue) return { r: 0, g: 0, b: 0 };

      const t = iterations / maxIterValue;

      switch (scheme) {
        case 'rainbow': {
          const hue = t * 360;
          return hslToRgb(hue, 80, 50);
        }
        case 'fire': {
          return {
            r: Math.floor(Math.min(255, t * 3 * 255)),
            g: Math.floor(Math.max(0, Math.min(255, (t - 0.33) * 3 * 255))),
            b: Math.floor(Math.max(0, Math.min(255, (t - 0.66) * 3 * 255)))
          };
        }
        case 'ocean': {
          return {
            r: Math.floor(t * 100),
            g: Math.floor(100 + t * 155),
            b: Math.floor(150 + t * 105)
          };
        }
        case 'neon': {
          const hue = (t * 180 + 180) % 360;
          return hslToRgb(hue, 100, 50 + t * 30);
        }
        case 'grayscale': {
          const v = Math.floor(t * 255);
          return { r: v, g: v, b: v };
        }
        case 'plasma': {
          return {
            r: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2)),
            g: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2 + 2.094)),
            b: Math.floor(128 + 127 * Math.sin(t * Math.PI * 2 + 4.188))
          };
        }
        case 'viridis': {
          const r = Math.floor(255 * (0.267 + t * (0.329 * Math.sin(Math.PI * t))));
          const g = Math.floor(255 * (0.005 + 0.988 * t - 0.5 * t * t));
          const b = Math.floor(255 * (0.329 + 0.5 * Math.sin(Math.PI * (t - 0.5))));
          return { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)) };
        }
        case 'sunset': {
          if (t < 0.25) {
            const s = t * 4;
            return { r: Math.floor(80 + s * 100), g: Math.floor(20 + s * 60), b: Math.floor(100 - s * 50) };
          } else if (t < 0.5) {
            const s = (t - 0.25) * 4;
            return { r: Math.floor(180 + s * 75), g: Math.floor(80 + s * 80), b: Math.floor(50 + s * 100) };
          } else if (t < 0.75) {
            const s = (t - 0.5) * 4;
            return { r: Math.floor(255), g: Math.floor(160 + s * 50), b: Math.floor(150 - s * 50) };
          } else {
            const s = (t - 0.75) * 4;
            return { r: Math.floor(255), g: Math.floor(210 + s * 45), b: Math.floor(100 + s * 100) };
          }
        }
        case 'copper': {
          return {
            r: Math.floor(Math.min(255, t * 320)),
            g: Math.floor(Math.min(200, t * 250)),
            b: Math.floor(Math.min(100, t * 120))
          };
        }
        case 'aurora': {
          const hue = 120 + t * 180;
          const sat = 70 + t * 30;
          const light = 40 + Math.sin(t * Math.PI) * 20;
          return hslToRgb(hue, sat, light);
        }
        case 'cyberpunk': {
          if (t < 0.5) {
            const s = t * 2;
            return { r: Math.floor(100 + s * 155), g: Math.floor(20 + s * 0), b: Math.floor(200 - s * 50) };
          } else {
            const s = (t - 0.5) * 2;
            return { r: Math.floor(255 - s * 200), g: Math.floor(20 + s * 100), b: Math.floor(150 + s * 105) };
          }
        }
        case 'marin': {
          if (t < 0.2) {
            const s = t * 5;
            return { r: Math.floor(60 + s * 50), g: Math.floor(30 + s * 30), b: Math.floor(25 + s * 15) };
          } else if (t < 0.35) {
            const s = (t - 0.2) * 6.67;
            return { r: Math.floor(110 + s * 40), g: Math.floor(60 + s * 50), b: Math.floor(40 + s * 30) };
          } else if (t < 0.5) {
            const s = (t - 0.35) * 6.67;
            return { r: Math.floor(150 - s * 70), g: Math.floor(110 + s * 50), b: Math.floor(70 - s * 20) };
          } else if (t < 0.65) {
            const s = (t - 0.5) * 6.67;
            return { r: Math.floor(80 + s * 130), g: Math.floor(160 + s * 50), b: Math.floor(50 + s * 30) };
          } else if (t < 0.8) {
            const s = (t - 0.65) * 6.67;
            return { r: Math.floor(210 - s * 30), g: Math.floor(210 - s * 20), b: Math.floor(80 + s * 100) };
          } else {
            const s = (t - 0.8) * 5;
            return { r: Math.floor(180 - s * 50), g: Math.floor(190 + s * 30), b: Math.floor(180 + s * 75) };
          }
        }
        case 'hsv-8': {
          const idx = Math.floor(iterations % 8);
          const hue = (idx / 8) * 360;
          return hslToRgb(hue, 100, 50);
        }
        case 'hsv-16': {
          const idx = Math.floor(iterations % 16);
          const hue = (idx / 16) * 360;
          return hslToRgb(hue, 100, 50);
        }
        case 'hsv-32': {
          const idx = Math.floor(iterations % 32);
          const hue = (idx / 32) * 360;
          return hslToRgb(hue, 100, 50);
        }
        default:
          return { r: 255, g: 255, b: 255 };
      }
    };

    const hslToRgb = (h, s, l) => {
      s /= 100;
      l /= 100;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r, g, b;

      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      return {
        r: Math.floor((r + m) * 255),
        g: Math.floor((g + m) * 255),
        b: Math.floor((b + m) * 255)
      };
    };

    // Halley's method iteration
    const halleyIterate = (z, func) => {
      const fz = func.f(z);
      const dfz = func.df(z);
      const d2fz = func.d2f(z);

      const numerator = cDiv(fz, dfz);
      const dfz2 = cMul(dfz, dfz);
      const term = cDiv(cMul(fz, d2fz), cMul({ re: 2, im: 0 }, dfz2));
      const denominator = cSub({ re: 1, im: 0 }, term);
      const correction = cDiv(numerator, denominator);

      return cSub(z, correction);
    };

    const renderFractal = async () => {
      const canvas = canvasRef.value;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const func = functions[formula.value];
      if (!func) return;

      isRendering.value = true;
      progress.value = 0;

      const { width, height } = canvasDimensions.value;
      const imageData = ctx.createImageData(width, height);
      const epsilon = 0.00001;

      const { minX, maxX, minY, maxY } = bounds;
      const xStep = (maxX - minX) / width;
      const yStep = (maxY - minY) / height;

      const chunkSize = Math.max(1, Math.floor(height / 32));

      for (let startRow = 0; startRow < height; startRow += chunkSize) {
        const endRow = Math.min(startRow + chunkSize, height);

        for (let py = startRow; py < endRow; py++) {
          for (let px = 0; px < width; px++) {
            const x = minX + px * xStep;
            const y = maxY - py * yStep;

            let z = { re: x, im: y };
            let iterations = 0;
            let prevMag = 0;

            for (let k = 0; k < maxIter.value; k++) {
              try {
                z = halleyIterate(z, func);
                const mag = z.re * z.re + z.im * z.im;

                if (k > 0 && Math.abs(mag - prevMag) < epsilon) {
                  iterations = k;
                  break;
                }
                prevMag = mag;
                iterations = k + 1;

                if (mag > 1e10 || isNaN(mag)) {
                  iterations = maxIter.value;
                  break;
                }
              } catch {
                iterations = maxIter.value;
                break;
              }
            }

            // Apply MATLAB-style even-iteration filter if enabled
            let color;
            if (evenIterOnly.value && iterations % 2 !== 0) {
              color = { r: 0, g: 0, b: 0 };
            } else {
              color = getColor(iterations, maxIter.value, colorScheme.value);
            }

            const idx = (py * width + px) * 4;
            imageData.data[idx] = color.r;
            imageData.data[idx + 1] = color.g;
            imageData.data[idx + 2] = color.b;
            imageData.data[idx + 3] = 255;
          }
        }

        progress.value = Math.floor((endRow / height) * 100);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      ctx.putImageData(imageData, 0, 0);
      isRendering.value = false;
      progress.value = 100;
    };

    // Download current canvas as PNG
    const downloadPNG = () => {
      const canvas = canvasRef.value;
      if (!canvas) return;

      const link = document.createElement('a');
      const { width, height } = canvasDimensions.value;
      link.download = `halley-fractal-${formula.value.replace(/[^a-z0-9]/gi, '')}-${width}x${height}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Watch for changes that require re-rendering
    watch([formula, maxIter, colorScheme, () => ({ ...bounds }), canvasDimensions, evenIterOnly], () => {
      renderFractal();
    });

    // Render on initial mount and keyboard controls
    onMounted(() => {
      renderFractal();
      const handleKeyDown = (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].includes(e.key)) {
          e.preventDefault();
        }

        switch (e.key) {
          case 'ArrowUp':
            handlePan(0, 1, e.shiftKey);
            break;
          case 'ArrowDown':
            handlePan(0, -1, e.shiftKey);
            break;
          case 'ArrowLeft':
            handlePan(-1, 0, e.shiftKey);
            break;
          case 'ArrowRight':
            handlePan(1, 0, e.shiftKey);
            break;
          case '+':
          case '=':
            handleZoom(2, e.shiftKey);
            break;
          case '-':
          case '_':
            handleZoom(0.5, e.shiftKey);
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const handleZoom = (baselineFactor, shiftKey = false) => {
      const { width, height } = canvasDimensions.value;
      const canvasAspect = width / height;

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Shift key for fine control: 1.2x instead of 2x
      const factor = shiftKey ? (baselineFactor > 1 ? 1.2 : 1/1.2) : baselineFactor;

      const rangeX = (bounds.maxX - bounds.minX) / factor;
      const rangeY = (bounds.maxY - bounds.minY) / factor;

      let newRangeX = rangeX;
      let newRangeY = rangeY;

      const newAspect = newRangeX / newRangeY;
      if (Math.abs(newAspect - canvasAspect) > 0.01) {
        if (canvasAspect > 1) {
          newRangeX = newRangeY * canvasAspect;
        } else {
          newRangeY = newRangeX / canvasAspect;
        }
      }

      Object.assign(bounds, {
        minX: centerX - newRangeX / 2,
        maxX: centerX + newRangeX / 2,
        minY: centerY - newRangeY / 2,
        maxY: centerY + newRangeY / 2
      });
    };

    const handlePan = (dx, dy, shiftKey = false) => {
      const rangeX = bounds.maxX - bounds.minX;
      const rangeY = bounds.maxY - bounds.minY;
      // Shift key for fine control (5%), normal is 25%
      const panAmount = shiftKey ? 0.05 : 0.25;
      const panX = dx * rangeX * panAmount;
      const panY = dy * rangeY * panAmount;

      Object.assign(bounds, {
        minX: bounds.minX + panX,
        maxX: bounds.maxX + panX,
        minY: bounds.minY + panY,
        maxY: bounds.maxY + panY
      });
    };

    const handleResolutionSliderHover = (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;

      // Slider range: 100 to 18000, step 100
      const min = 100;
      const max = 18000;
      const rawValue = min + (max - min) * percentage;
      const steppedValue = Math.round(rawValue / 100) * 100;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      resolutionHover.show = true;
      resolutionHover.value = clampedValue;
      resolutionHover.x = e.clientX;
      resolutionHover.y = e.clientY;
    };

    const handleResolutionSliderLeave = () => {
      resolutionHover.show = false;
    };

    const handleMaxIterSliderHover = (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;

      // Slider range: 20 to 150, step 10
      const min = 20;
      const max = 150;
      const rawValue = min + (max - min) * percentage;
      const steppedValue = Math.round(rawValue / 10) * 10;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      maxIterHover.show = true;
      maxIterHover.value = clampedValue;
      maxIterHover.x = e.clientX;
      maxIterHover.y = e.clientY;
    };

    const handleMaxIterSliderLeave = () => {
      maxIterHover.show = false;
    };

    const setResolution = (pixels) => {
      resolution.value = pixels;
    };

    const handleCanvasClick = (e) => {
      const canvas = canvasRef.value;
      const rect = canvas.getBoundingClientRect();
      const { width, height } = canvasDimensions.value;
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      const x = bounds.minX + (px / width) * (bounds.maxX - bounds.minX);
      const y = bounds.maxY - (py / height) * (bounds.maxY - bounds.minY);

      const rangeX = (bounds.maxX - bounds.minX) / 2;
      const rangeY = (bounds.maxY - bounds.minY) / 2;

      Object.assign(bounds, {
        minX: x - rangeX / 2,
        maxX: x + rangeX / 2,
        minY: y - rangeY / 2,
        maxY: y + rangeY / 2
      });
    };

    const resetView = () => {
      Object.assign(bounds, { minX: -3, maxX: 3, minY: -3, maxY: 3 });
    };

    const toggleFullscreen = () => {
      const canvas = canvasRef.value;
      if (!canvas) return;

      if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    };

    const printSizeText = computed(() => {
      const { width, height } = canvasDimensions.value;
      return `Print size @ 300 DPI: ${(width / 300).toFixed(1)}" × ${(height / 300).toFixed(1)}"`;
    });

    const speedIndicator = computed(() => {
      if (resolution.value <= 300) return '⚡ Fast';
      if (resolution.value <= 600) return '⏱️ Medium';
      if (resolution.value <= 1200) return '🐢 Slow';
      if (resolution.value <= 3600) return '🐌 Very slow';
      return '⏳ Extremely slow';
    });

    return {
      canvasRef,
      resolution,
      formula,
      maxIter,
      colorScheme,
      aspectRatio,
      evenIterOnly,
      isRendering,
      progress,
      showCopied,
      selectedPreset,
      canvasDimensions,
      bounds,
      resolutionHover,
      maxIterHover,
      PRESETS,
      functions,
      applyPreset,
      copyShareLink,
      downloadPNG,
      handleZoom,
      handlePan,
      handleResolutionSliderHover,
      handleResolutionSliderLeave,
      handleMaxIterSliderHover,
      handleMaxIterSliderLeave,
      setResolution,
      handleCanvasClick,
      resetView,
      toggleFullscreen,
      printSizeText,
      speedIndicator
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-white p-4">
      <!-- Resolution Slider Hover Tooltip -->
      <div
        v-if="resolutionHover.show"
        :style="{
          position: 'fixed',
          left: resolutionHover.x + 'px',
          top: (resolutionHover.y - 40) + 'px',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 9999
        }"
        class="bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium border border-gray-600"
      >
        {{ resolutionHover.value }}px
      </div>

      <!-- Max Iterations Slider Hover Tooltip -->
      <div
        v-if="maxIterHover.show"
        :style="{
          position: 'fixed',
          left: maxIterHover.x + 'px',
          top: (maxIterHover.y - 40) + 'px',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 9999
        }"
        class="bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium border border-gray-600"
      >
        {{ maxIterHover.value }}
      </div>

      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-center mb-2 text-white">
          Halley Art
        </h1>
        <p class="text-gray-400 text-center mb-6 text-sm">
          Click to zoom • Arrow keys to pan • +/- to zoom in/out • Shift for fine control
        </p>

        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Canvas -->
          <div class="flex-1">
            <div class="relative bg-black rounded-lg overflow-hidden shadow-2xl shadow-purple-500/20 ring-1 ring-gray-800">
              <canvas
                ref="canvasRef"
                :width="canvasDimensions.width"
                :height="canvasDimensions.height"
                @click="handleCanvasClick"
                class="w-full cursor-crosshair"
                style="image-rendering: pixelated;"
              />

              <!-- Floating Download Button -->
              <button
                v-if="!isRendering"
                @click="downloadPNG"
                class="absolute bottom-3 right-3 p-3 bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 group"
                title="Download PNG"
              >
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </button>

              <div v-if="isRendering" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div class="text-center">
                  <div class="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all bg-gradient-to-r from-purple-500 to-pink-500"
                      :style="{ width: progress + '%' }"
                    />
                  </div>
                  <p class="mt-2 text-sm">
                    Rendering... {{ progress }}%
                  </p>
                  <p class="mt-1 text-xs text-gray-400">
                    Adjust settings to restart
                  </p>
                </div>
              </div>
            </div>

            <!-- Zoom and Pan Controls -->
            <div class="flex flex-col gap-2 mt-3">
              <div class="flex gap-2 justify-center">
                <button
                  @click="(e) => handleZoom(2, e.shiftKey)"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title="Zoom In (Shift for fine control)"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                  </svg>
                </button>
                <button
                  @click="(e) => handleZoom(0.5, e.shiftKey)"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title="Zoom Out (Shift for fine control)"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35M8 11h6"/>
                  </svg>
                </button>
                <button
                  @click="resetView"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title="Reset View"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                </button>
                <button
                  @click="toggleFullscreen"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 hover:text-blue-400 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title="Toggle Fullscreen"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </button>
              </div>

              <!-- Pan Controls -->
              <div class="flex justify-center">
                <div class="grid grid-cols-3 gap-1">
                  <div></div>
                  <button
                    @click="(e) => handlePan(0, 1, e.shiftKey)"
                    class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Pan Up (Shift for fine control)"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                  </button>
                  <div></div>
                  <button
                    @click="(e) => handlePan(-1, 0, e.shiftKey)"
                    class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Pan Left (Shift for fine control)"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div class="px-3 py-2 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700">
                    <svg class="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"/>
                    </svg>
                  </div>
                  <button
                    @click="(e) => handlePan(1, 0, e.shiftKey)"
                    class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Pan Right (Shift for fine control)"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <div></div>
                  <button
                    @click="(e) => handlePan(0, -1, e.shiftKey)"
                    class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                    title="Pan Down (Shift for fine control)"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                  </button>
                  <div></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div class="lg:w-64 space-y-4">
            <!-- Presets -->
            <div class="bg-gray-800 border-l-4 border-amber-500 rounded-lg p-3 shadow-lg">
              <label class="block text-sm font-medium mb-2 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span>Gallery Presets</span>
              </label>
              <select
                v-model="selectedPreset"
                @change="applyPreset(selectedPreset)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm mb-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option v-for="(preset, key) in PRESETS" :key="key" :value="key">
                  {{ preset.name }}
                </option>
              </select>
              <p v-if="PRESETS[selectedPreset]" class="text-xs text-gray-400 italic">
                {{ PRESETS[selectedPreset].desc }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Formula</label>
              <select
                v-model="formula"
                class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <optgroup label="Classic Symmetric">
                  <option value="z³ - 1">z³ - 1</option>
                  <option value="z⁴ - 1">z⁴ - 1</option>
                  <option value="z⁵ - 1">z⁵ - 1</option>
                  <option value="z⁶ - 1">z⁶ - 1</option>
                  <option value="z⁷ - 1">z⁷ - 1</option>
                  <option value="z⁸ - 1">z⁸ - 1</option>
                  <option value="z¹² - 1">z¹² - 1</option>
                </optgroup>
                <optgroup label="Symmetry Breaking">
                  <option value="z³ - 0.5">z³ - 0.5</option>
                  <option value="z⁴ - 2">z⁴ - 2</option>
                  <option value="z⁴ + z² - 1">z⁴ + z² - 1</option>
                  <option value="z⁵ + z - 1">z⁵ + z - 1</option>
                  <option value="z³ - z">z³ - z</option>
                  <option value="z⁵ - z²">z⁵ - z²</option>
                  <option value="z⁵ - z³">z⁵ - z³</option>
                  <option value="z⁶ + z³ - 1">z⁶ + z³ - 1</option>
                </optgroup>
                <optgroup label="Complex Parameter (Julia-like)">
                  <option value="z³ + (0.3+0.5i)">z³ + (0.3+0.5i)</option>
                  <option value="z³ + (-0.2+0.8i)">z³ + (-0.2+0.8i)</option>
                  <option value="z³ + (1+i)">z³ + (1+i)</option>
                  <option value="z³ + (0.5+0.2i)">z³ + (0.5+0.2i)</option>
                  <option value="z⁴ + (0.2+0.4i)">z⁴ + (0.2+0.4i)</option>
                </optgroup>
                <optgroup label="Rational (Poles & Roots)">
                  <option value="(z² + 1)/(z³ - 1)">(z² + 1)/(z³ - 1)</option>
                  <option value="(z³ - 2)/(z - 1)">(z³ - 2)/(z - 1)</option>
                </optgroup>
                <optgroup label="Transcendental">
                  <option value="sin(z)">sin(z)</option>
                  <option value="cos(z) - 1">cos(z) - 1</option>
                  <option value="exp(z) - 1">exp(z) - 1</option>
                  <option value="sinh(z) - 1">sinh(z) - 1</option>
                  <option value="z³ + sin(z)">z³ + sin(z)</option>
                  <option value="sin(z)·exp(z) - 1">sin(z)·exp(z) - 1</option>
                  <option value="z⁴ + exp(-z)">z⁴ + exp(-z)</option>
                  <option value="sin(z²) - 1">sin(z²) - 1</option>
                  <option value="z·exp(z) - 1">z·exp(z) - 1</option>
                </optgroup>
              </select>
              <p v-if="functions[formula]" class="text-xs text-gray-400 mt-2 leading-relaxed border-l-2 border-gray-700 pl-2">
                {{ functions[formula].desc }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Color Scheme</label>
              <select
                v-model="colorScheme"
                class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <optgroup label="Smooth Gradients">
                  <option value="rainbow">Rainbow</option>
                  <option value="fire">Fire</option>
                  <option value="ocean">Ocean</option>
                  <option value="neon">Neon</option>
                  <option value="plasma">Plasma</option>
                  <option value="viridis">Viridis</option>
                  <option value="sunset">Sunset</option>
                  <option value="copper">Copper</option>
                  <option value="aurora">Aurora</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="marin">Marin</option>
                  <option value="grayscale">Grayscale</option>
                </optgroup>
                <optgroup label="MATLAB-Style HSV (Discrete)">
                  <option value="hsv-8">HSV-8 (Classic)</option>
                  <option value="hsv-16">HSV-16</option>
                  <option value="hsv-32">HSV-32</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  v-model="evenIterOnly"
                  class="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                <span class="font-medium">Even iterations only</span>
              </label>
              <p class="text-xs text-gray-400 mt-1 ml-6">
                High-contrast mode
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Aspect Ratio</label>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="ratio in ['1:1', '4:3', '16:9', '21:9', '9:16']"
                  :key="ratio"
                  @click="aspectRatio = ratio"
                  :class="[
                    'px-2 py-2 text-xs rounded-lg font-medium transition-all',
                    aspectRatio === ratio
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
                  ]"
                >
                  {{ ratio }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">
                Resolution: {{ canvasDimensions.width }} × {{ canvasDimensions.height }}px
              </label>
              <div class="relative">
                <input
                  type="range"
                  min="100"
                  max="18000"
                  step="100"
                  v-model.number="resolution"
                  @mousemove="handleResolutionSliderHover"
                  @mouseleave="handleResolutionSliderLeave"
                  class="w-full cursor-pointer"
                />
                <!-- Tick marks for common resolutions -->
                <div class="relative w-full h-6 mt-1">
                  <!-- 2K mark at 1920px = 10.17% -->
                  <button @click="setResolution(1920)" class="absolute group" style="left: 10.17%; transform: translateX(-50%)">
                    <div class="w-0.5 h-2 bg-gray-500 group-hover:bg-amber-400 mx-auto transition-colors"></div>
                    <div class="text-xs text-gray-500 group-hover:text-amber-400 mt-0.5 whitespace-nowrap transition-colors cursor-pointer">2K</div>
                  </button>
                  <!-- 4K mark at 3840px = 20.89% -->
                  <button @click="setResolution(3840)" class="absolute group" style="left: 20.89%; transform: translateX(-50%)">
                    <div class="w-0.5 h-2 bg-gray-400 group-hover:bg-amber-400 mx-auto transition-colors"></div>
                    <div class="text-xs text-gray-400 group-hover:text-amber-400 mt-0.5 whitespace-nowrap font-medium transition-colors cursor-pointer">4K</div>
                  </button>
                  <!-- 8K mark at 7680px = 42.35% -->
                  <button @click="setResolution(7680)" class="absolute group" style="left: 42.35%; transform: translateX(-50%)">
                    <div class="w-0.5 h-2 bg-gray-400 group-hover:bg-amber-400 mx-auto transition-colors"></div>
                    <div class="text-xs text-gray-400 group-hover:text-amber-400 mt-0.5 whitespace-nowrap font-medium transition-colors cursor-pointer">8K</div>
                  </button>
                  <!-- Min/Max labels -->
                  <button @click="setResolution(100)" class="absolute left-0 text-xs text-gray-600 hover:text-amber-400 transition-colors cursor-pointer">100</button>
                  <button @click="setResolution(18000)" class="absolute group" style="right: 0; transform: translateX(50%)">
                    <div class="w-0.5 h-2 bg-gray-400 group-hover:bg-amber-400 mx-auto transition-colors"></div>
                    <div class="text-xs text-gray-400 group-hover:text-amber-400 mt-0.5 whitespace-nowrap font-medium transition-colors cursor-pointer">18K</div>
                  </button>
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ speedIndicator }}
              </p>
              <p class="text-xs text-blue-400 mt-1">
                {{ printSizeText }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">
                Max Iterations: {{ maxIter }}
              </label>
              <input
                type="range"
                min="20"
                max="150"
                step="10"
                v-model.number="maxIter"
                @mousemove="handleMaxIterSliderHover"
                @mouseleave="handleMaxIterSliderLeave"
                class="w-full cursor-pointer"
              />
            </div>

            <div class="pt-4 border-t border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium flex items-center gap-2">
                  <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/>
                  </svg>
                  Current View
                </h3>
                <button
                  @click="copyShareLink"
                  :class="[
                    'flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all',
                    showCopied
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  ]"
                  title="Copy shareable link"
                >
                  <svg v-if="showCopied" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <span>{{ showCopied ? 'Copied!' : 'Share' }}</span>
                </button>
              </div>
              <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div class="text-xs text-gray-400 space-y-1.5 font-mono">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500">X:</span>
                    <span>[{{ bounds.minX.toFixed(6) }}, {{ bounds.maxX.toFixed(6) }}]</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500">Y:</span>
                    <span>[{{ bounds.minY.toFixed(6) }}, {{ bounds.maxY.toFixed(6) }}]</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Export Section -->
            <div class="pt-4 border-t border-gray-700">
              <h3 class="text-sm font-medium mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export
              </h3>

              <div class="space-y-2">
                <button
                  @click="downloadPNG"
                  :disabled="isRendering"
                  :class="[
                    'w-full py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2',
                    isRendering
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white'
                  ]"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Download PNG
                </button>
              </div>

              <div class="mt-3 p-2 bg-gray-800 rounded-lg">
                <p class="text-xs text-gray-400">
                  <strong class="text-orange-400">PNG:</strong> Fast, exact pixel output.
                </p>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-700">
              <h3 class="text-sm font-medium mb-2">About</h3>
              <p class="text-xs text-gray-400">
                This fractal is generated using <a href="https://en.wikipedia.org/wiki/Halley%27s_method" class="text-blue-400 hover:text-blue-300">Halley's method</a>, a root-finding algorithm.
                Each pixel's color represents how quickly the algorithm converges when
                starting from that point in the complex plane.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
