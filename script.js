const originalCanvas = document.getElementById('originalCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const guideCanvas = document.getElementById('guideCanvas');

const imageInput = document.getElementById('imageInput');
const colsInput = document.getElementById('colsInput');
const rowsInput = document.getElementById('rowsInput');
const colorsInput = document.getElementById('colorsInput');
const processBtn = document.getElementById('processBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const sendToGuideBtn = document.getElementById('sendToGuideBtn');
const paletteSwatches = document.getElementById('paletteSwatches');

const gridInput = document.getElementById('gridInput');
const useLastBtn = document.getElementById('useLastBtn');
const resetGuideBtn = document.getElementById('resetGuideBtn');
const backBtn = document.getElementById('backBtn');
const undoBtn = document.getElementById('undoBtn');
const nextBtn = document.getElementById('nextBtn');

const guideMeta = document.getElementById('guideMeta');
const guideCurrent = document.getElementById('guideCurrent');
const guideNext = document.getElementById('guideNext');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

let loadedImage = null;
let quantizedData = null; // { palette: [ {r,g,b,hex} ], grid: number[][], cols, rows }
let guideState = { runs: [], palette: [], grid: [], pointer: 0, history: [] };

const ctxOriginal = originalCanvas.getContext('2d');
const ctxGrid = gridCanvas.getContext('2d');
const ctxGuide = guideCanvas.getContext('2d');

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const rgbToHex = ({ r, g, b }) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

// Very lightweight hue-based name for user-friendly labels.
const hexToColorName = (hex) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const r1 = r / 255;
    const g1 = g / 255;
    const b1 = b / 255;
    const max = Math.max(r1, g1, b1);
    const min = Math.min(r1, g1, b1);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    if (d !== 0) {
        if (max === r1) h = ((g1 - b1) / d) % 6;
        else if (max === g1) h = (b1 - r1) / d + 2;
        else h = (r1 - g1) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    if (l <= 0.08) return 'black';
    if (l >= 0.92) return 'white';
    if (s < 0.08) return 'gray';

    if (h < 15 || h >= 345) return 'red';
    if (h < 45) return 'orange';
    if (h < 70) return 'yellow';
    if (h < 95) return 'lime';
    if (h < 150) return 'green';
    if (h < 180) return 'teal';
    if (h < 205) return 'cyan';
    if (h < 225) return 'sky';
    if (h < 255) return 'blue';
    if (h < 275) return 'indigo';
    if (h < 300) return 'purple';
    if (h < 325) return 'magenta';
    return 'pink';
};

const distance = (a, b) => {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
};

const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

// Deterministic k-means seeded by most frequent coarse bins to keep palettes stable.
const nearestPaletteIndex = (color, palette) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
        const d = distance(color, palette[i]);
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    }
    return best;
};

const kMeans = (pixels, k, iterations = 10) => {
    // Bin colors to find dominant starting centroids.
    const binSize = 16; // 0-255 -> 16 bins; coarse but good for dominance detection.
    const binMap = new Map();
    pixels.forEach(p => {
        const br = Math.floor(p.r / binSize);
        const bg = Math.floor(p.g / binSize);
        const bb = Math.floor(p.b / binSize);
        const key = `${br},${bg},${bb}`;
        const entry = binMap.get(key) || { sumR: 0, sumG: 0, sumB: 0, count: 0 };
        entry.sumR += p.r;
        entry.sumG += p.g;
        entry.sumB += p.b;
        entry.count += 1;
        binMap.set(key, entry);
    });

    const bins = Array.from(binMap.entries()).map(([key, v]) => {
        const avg = {
            r: Math.round(v.sumR / v.count),
            g: Math.round(v.sumG / v.count),
            b: Math.round(v.sumB / v.count)
        };
        return { key, avg, count: v.count, lum: luminance(avg) };
    });

    bins.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lum - a.lum; // tie-breaker: brighter first for consistency
    });

    // If unique bins <= k, return them directly to keep exact palette for pixel art.
    if (bins.length <= k) {
        const palette = bins.map(b => ({ ...b.avg, hex: rgbToHex(b.avg) })).slice(0, k);
        const assignments = pixels.map(p => nearestPaletteIndex(p, palette));
        return { palette, assignments };
    }

    const centroids = [];
    for (let i = 0; i < k; i += 1) {
        const src = bins[i] || bins[bins.length - 1];
        centroids.push({ ...src.avg });
    }

    for (let iter = 0; iter < iterations; iter += 1) {
        const clusters = Array.from({ length: k }, () => ({ sumR: 0, sumG: 0, sumB: 0, count: 0 }));
        pixels.forEach(p => {
            let best = 0;
            let bestDist = Infinity;
            centroids.forEach((c, idx) => {
                const d = distance(p, c);
                if (d < bestDist) {
                    bestDist = d;
                    best = idx;
                }
            });
            const cluster = clusters[best];
            cluster.sumR += p.r;
            cluster.sumG += p.g;
            cluster.sumB += p.b;
            cluster.count += 1;
        });

        clusters.forEach((c, idx) => {
            if (c.count === 0) return;
            centroids[idx] = {
                r: Math.round(c.sumR / c.count),
                g: Math.round(c.sumG / c.count),
                b: Math.round(c.sumB / c.count)
            };
        });
    }

    const palette = centroids.map(c => ({ ...c, hex: rgbToHex(c) }));
    const assignments = pixels.map(p => nearestPaletteIndex(p, palette));

    return { palette, assignments };
};

const buildDominantGrid = (palette, imageData, sampleW, sampleH, cols, rows, sampleScale) => {
    const data = imageData.data;
    const grid = [];
    for (let r = 0; r < rows; r += 1) {
        const row = [];
        for (let c = 0; c < cols; c += 1) {
            const counts = new Array(palette.length).fill(0);
            for (let sy = 0; sy < sampleScale; sy += 1) {
                const y = r * sampleScale + sy;
                const base = y * sampleW;
                for (let sx = 0; sx < sampleScale; sx += 1) {
                    const x = c * sampleScale + sx;
                    const idx = (base + x) * 4;
                    const color = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
                    const pi = nearestPaletteIndex(color, palette);
                    counts[pi] += 1;
                }
            }
            let bestIdx = 0;
            let bestCount = -1;
            counts.forEach((cnt, idx) => {
                if (cnt > bestCount) {
                    bestCount = cnt;
                    bestIdx = idx;
                }
            });
            row.push(bestIdx);
        }
        grid.push(row);
    }
    return grid;
};

const drawCanvasImage = (canvas, img) => {
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);
};

const drawGrid = (canvas, palette, grid) => {
    const ctx = canvas.getContext('2d');
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const size = 420;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    if (!rows || !cols) return;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            const idx = grid[r][c];
            const color = palette[idx];
            ctx.fillStyle = color ? color.hex : '#000';
            ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c += 1) {
        const x = c * cellW + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
    }
    for (let r = 0; r <= rows; r += 1) {
        const y = r * cellH + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
    }
};

const drawGuide = (palette, grid, currentRun) => {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const size = 420;
    guideCanvas.width = size;
    guideCanvas.height = size;
    ctxGuide.clearRect(0, 0, size, size);
    if (!rows || !cols) return;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            const idx = grid[r][c];
            const color = palette[idx];
            ctxGuide.fillStyle = color ? color.hex : '#000';
            ctxGuide.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
    }

    if (currentRun) {
        const x = currentRun.startCol * cellW;
        const y = currentRun.row * cellH;
        const w = currentRun.length * cellW;
        const h = cellH;
        ctxGuide.fillStyle = 'rgba(255,255,255,0.16)';
        ctxGuide.fillRect(x, y, w, h);
        // Dual stroke for visibility on any background.
        ctxGuide.lineWidth = 4;
        ctxGuide.strokeStyle = 'rgba(0,0,0,0.9)';
        ctxGuide.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctxGuide.lineWidth = 2;
        ctxGuide.strokeStyle = '#ffffff';
        ctxGuide.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }

    ctxGuide.strokeStyle = 'rgba(0,0,0,0.25)';
    ctxGuide.lineWidth = 1;
    for (let c = 0; c <= cols; c += 1) {
        const x = c * cellW + 0.5;
        ctxGuide.beginPath();
        ctxGuide.moveTo(x, 0);
        ctxGuide.lineTo(x, size);
        ctxGuide.stroke();
    }
    for (let r = 0; r <= rows; r += 1) {
        const y = r * cellH + 0.5;
        ctxGuide.beginPath();
        ctxGuide.moveTo(0, y);
        ctxGuide.lineTo(size, y);
        ctxGuide.stroke();
    }
};

const buildRuns = (grid) => {
    const runs = [];
    for (let r = 0; r < grid.length; r += 1) {
        const row = grid[r];
        let start = 0;
        while (start < row.length) {
            const color = row[start];
            let end = start + 1;
            while (end < row.length && row[end] === color) end += 1;
            runs.push({ row: r, startCol: start, length: end - start, colorIndex: color });
            start = end;
        }
    }
    return runs;
};

const updatePaletteUI = (palette) => {
    paletteSwatches.innerHTML = '';
    palette.forEach((c, idx) => {
        const sw = document.createElement('div');
        sw.className = 'swatch';
        sw.style.background = c.hex;
        sw.textContent = idx + 1;
        paletteSwatches.appendChild(sw);
    });
};

const handleImageLoad = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;
            drawCanvasImage(originalCanvas, img);
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
};

const processImage = () => {
    if (!loadedImage) return alert('Select an image first.');
    const cols = clamp(parseInt(colsInput.value, 10) || 0, 2, 200);
    const rows = clamp(parseInt(rowsInput.value, 10) || 0, 2, 200);
    const colors = clamp(parseInt(colorsInput.value, 10) || 0, 2, 24);

    const sampleScale = 4; // sample more pixels per cell to avoid color bleed
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cols * sampleScale;
    tempCanvas.height = rows * sampleScale;
    const tctx = tempCanvas.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(loadedImage, 0, 0, tempCanvas.width, tempCanvas.height);
    const imageData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    const pixels = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] });
    }

    const { palette } = kMeans(pixels, colors);
    const grid = buildDominantGrid(palette, imageData, tempCanvas.width, tempCanvas.height, cols, rows, sampleScale);

    quantizedData = { palette, grid, cols, rows };
    updatePaletteUI(palette);
    drawGrid(gridCanvas, palette, grid);
    downloadJsonBtn.disabled = false;
    downloadPngBtn.disabled = false;
    sendToGuideBtn.disabled = false;
    useLastBtn.disabled = false;
};

const downloadJson = () => {
    if (!quantizedData) return;
    const blob = new Blob([JSON.stringify(quantizedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grid.json';
    a.click();
    URL.revokeObjectURL(url);
};

const downloadPng = () => {
    if (!quantizedData) return;
    const size = 20;
    const canvas = document.createElement('canvas');
    canvas.width = quantizedData.cols * size;
    canvas.height = quantizedData.rows * size;
    const ctx = canvas.getContext('2d');
    for (let r = 0; r < quantizedData.rows; r += 1) {
        for (let c = 0; c < quantizedData.cols; c += 1) {
            const idx = quantizedData.grid[r][c];
            ctx.fillStyle = quantizedData.palette[idx].hex;
            ctx.fillRect(c * size, r * size, size, size);
        }
    }
    ctx.strokeStyle = '#222';
    for (let c = 0; c <= quantizedData.cols; c += 1) {
        ctx.beginPath();
        ctx.moveTo(c * size + 0.5, 0);
        ctx.lineTo(c * size + 0.5, canvas.height);
        ctx.stroke();
    }
    for (let r = 0; r <= quantizedData.rows; r += 1) {
        ctx.beginPath();
        ctx.moveTo(0, r * size + 0.5);
        ctx.lineTo(canvas.width, r * size + 0.5);
        ctx.stroke();
    }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart.png';
    a.click();
};

const loadGuide = (data) => {
    if (!data || !data.grid || !data.palette) return;
    guideState.palette = data.palette;
    guideState.grid = data.grid;
    guideState.runs = buildRuns(data.grid);
    guideState.pointer = 0;
    guideState.history = [];
    backBtn.disabled = true;
    undoBtn.disabled = true;
    nextBtn.disabled = guideState.runs.length === 0;
    resetGuideBtn.disabled = false;
    updateGuideUI();
};

const updateGuideUI = () => {
    const { runs, pointer, palette, grid } = guideState;
    if (!runs.length) {
        guideMeta.textContent = 'No grid loaded.';
        guideCurrent.textContent = '—';
        guideNext.textContent = 'Next: —';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        ctxGuide.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
        return;
    }

    const run = runs[pointer];
    const nextRun = runs[pointer + 1];
    const color = palette[run.colorIndex];
    const colorName = color ? hexToColorName(color.hex) : `color ${run.colorIndex + 1}`;
    guideMeta.textContent = `Row ${run.row + 1} of ${grid.length}, run ${pointer + 1} of ${runs.length}`;
    guideCurrent.textContent = `${run.length} × color ${run.colorIndex + 1} (${colorName}) starting at col ${run.startCol + 1}`;
    guideNext.textContent = nextRun ? `Next: ${nextRun.length} × color ${nextRun.colorIndex + 1}` : 'Next: done';

    const pct = Math.round(((pointer + 1) / runs.length) * 100);
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `${pct}%`;

    drawGuide(palette, grid, run);

    backBtn.disabled = pointer === 0;
    nextBtn.disabled = pointer >= runs.length - 1;
    undoBtn.disabled = guideState.history.length === 0;
};

const advance = () => {
    if (guideState.pointer >= guideState.runs.length - 1) return;
    guideState.history.push(guideState.pointer);
    guideState.pointer += 1;
    updateGuideUI();
};

const back = () => {
    if (guideState.pointer === 0) return;
    guideState.pointer -= 1;
    updateGuideUI();
};

const undo = () => {
    if (!guideState.history.length) return;
    const prev = guideState.history.pop();
    guideState.pointer = prev;
    updateGuideUI();
};

const resetGuide = () => {
    guideState.pointer = 0;
    guideState.history = [];
    updateGuideUI();
};

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageLoad(file);
});

processBtn.addEventListener('click', processImage);
downloadJsonBtn.addEventListener('click', downloadJson);
downloadPngBtn.addEventListener('click', downloadPng);
sendToGuideBtn.addEventListener('click', () => {
    if (quantizedData) loadGuide(quantizedData);
});

gridInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            loadGuide(data);
        } catch (err) {
            alert('Could not parse grid file.');
        }
    };
    reader.readAsText(file);
});

useLastBtn.addEventListener('click', () => {
    if (quantizedData) loadGuide(quantizedData);
});

resetGuideBtn.addEventListener('click', resetGuide);
backBtn.addEventListener('click', back);
nextBtn.addEventListener('click', advance);
undoBtn.addEventListener('click', undo);

document.addEventListener('keydown', (e) => {
    if (guideState.runs.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
        advance();
    } else if (e.key === 'ArrowLeft') {
        back();
    } else if (e.key === 'u' || e.key === 'U') {
        undo();
    }
});

