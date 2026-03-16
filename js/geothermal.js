function getValue(id) {
  return parseFloat(document.getElementById(id).value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/*
  Screening-level estimate of unit extraction rate (W/m)
  Reference condition:
  - q_ref = 50 W/m
  - k_ref = 2.5 W/m·K
  - Cv_ref = 2.2 MJ/m³·K

  This is intentionally simplified for preliminary layout sizing only.
*/
function estimateUnitExtractionRate(k, Cv_MJ) {
  const qRef = 50.0;
  const kRef = 2.5;
  const CvRef = 2.2;

  const rate =
    qRef *
    Math.pow(k / kRef, 0.6) *
    Math.pow(Cv_MJ / CvRef, 0.2);

  return clamp(rate, 20, 80);
}

function estimateRecommendedSpacing(k, userMinSpacing) {
  // Slightly tighter spacing can be tolerated for better conductivity, but keep practical bounds
  const baseSpacing = 6.0 - 0.5 * (k - 2.5);
  const spacing = clamp(baseSpacing, 4.5, 7.5);
  return Math.max(spacing, userMinSpacing);
}

function determineGrid(nBoreholes) {
  const cols = Math.ceil(Math.sqrt(nBoreholes));
  const rows = Math.ceil(nBoreholes / cols);
  return { rows, cols };
}

function validateInputs(P, peakFactor, k, Cv, Hmax, Smin, maxBoreholes) {
  if ([P, peakFactor, k, Cv, Hmax, Smin, maxBoreholes].some(v => isNaN(v))) {
    return "Please enter valid numeric values.";
  }
  if (P <= 0 || peakFactor <= 0 || k <= 0 || Cv <= 0 || Hmax <= 0 || Smin <= 0 || maxBoreholes < 1) {
    return "All input values must be positive.";
  }
  return null;
}

function drawBHELayout(rows, cols, spacing, depth, nBoreholes) {
  const canvas = document.getElementById("bheCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const marginLeft = 90;
  const marginTop = 80;
  const marginRight = 90;
  const marginBottom = 90;

  const plotWidth = canvas.width - marginLeft - marginRight;
  const plotHeight = canvas.height - marginTop - marginBottom;

  const xGap = cols > 1 ? plotWidth / (cols - 1) : 0;
  const yGap = rows > 1 ? plotHeight / (rows - 1) : 0;

  // Title
  ctx.font = "20px Arial";
  ctx.fillStyle = "#1f2937";
  ctx.fillText("Indicative Borehole Field Layout", 30, 35);

  ctx.font = "15px Arial";
  ctx.fillText(`No. of boreholes = ${nBoreholes}`, 30, 60);
  ctx.fillText(`Spacing = ${spacing.toFixed(1)} m`, 250, 60);
  ctx.fillText(`Depth = ${depth.toFixed(1)} m`, 430, 60);

  // Plot boundary
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(marginLeft, marginTop, plotWidth, plotHeight);

  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (count >= nBoreholes) break;

      const x = cols === 1 ? marginLeft + plotWidth / 2 : marginLeft + c * xGap;
      const y = rows === 1 ? marginTop + plotHeight / 2 : marginTop + r * yGap;

      // Borehole marker
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.font = "12px Arial";
      ctx.fillStyle = "#111827";
      ctx.fillText(`${count + 1}`, x - 4, y + 4);

      count++;
    }
  }

  // Dimensions
  const footprintX = cols > 1 ? (cols - 1) * spacing : 0;
  const footprintY = rows > 1 ? (rows - 1) * spacing : 0;

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.2;

  // Horizontal dimension line
  ctx.beginPath();
  ctx.moveTo(marginLeft, canvas.height - 45);
  ctx.lineTo(marginLeft + plotWidth, canvas.height - 45);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(marginLeft, canvas.height - 52);
  ctx.lineTo(marginLeft, canvas.height - 38);
  ctx.moveTo(marginLeft + plotWidth, canvas.height - 52);
  ctx.lineTo(marginLeft + plotWidth, canvas.height - 38);
  ctx.stroke();

  ctx.font = "14px Arial";
  ctx.fillStyle = "#1f2937";
  ctx.fillText(`Approx. footprint width ≈ ${footprintX.toFixed(1)} m`, marginLeft + plotWidth / 2 - 95, canvas.height - 55);

  // Vertical dimension line
  ctx.beginPath();
  ctx.moveTo(45, marginTop);
  ctx.lineTo(45, marginTop + plotHeight);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(38, marginTop);
  ctx.lineTo(52, marginTop);
  ctx.moveTo(38, marginTop + plotHeight);
  ctx.lineTo(52, marginTop + plotHeight);
  ctx.stroke();

  ctx.save();
  ctx.translate(18, marginTop + plotHeight / 2 + 80);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`Approx. footprint length ≈ ${footprintY.toFixed(1)} m`, 0, 0);
  ctx.restore();
}

function runBHEDesign() {
  const P = getValue("heatDemand");
  const peakFactor = getValue("peakFactor");
  const k = getValue("conductivity");
  const Cv = getValue("capacity");
  const Hmax = getValue("maxDepth");
  const Smin = getValue("minSpacing");
  const maxBoreholes = parseInt(document.getElementById("maxBoreholes").value, 10);

  const validationMessage = validateInputs(P, peakFactor, k, Cv, Hmax, Smin, maxBoreholes);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  const designLoad = P * peakFactor; // kW
  const unitRate = estimateUnitExtractionRate(k, Cv); // W/m
  const totalLength = (designLoad * 1000) / unitRate; // m

  let nBoreholes = Math.ceil(totalLength / Hmax);
  nBoreholes = Math.max(1, Math.min(nBoreholes, maxBoreholes));

  const boreholeDepth = totalLength / nBoreholes;
  const spacing = estimateRecommendedSpacing(k, Smin);

  const grid = determineGrid(nBoreholes);
  const footprintWidth = grid.cols > 1 ? (grid.cols - 1) * spacing : 0;
  const footprintLength = grid.rows > 1 ? (grid.rows - 1) * spacing : 0;

  document.getElementById("unitRateOut").textContent = unitRate.toFixed(1);
  document.getElementById("totalLengthOut").textContent = totalLength.toFixed(0);
  document.getElementById("nBoreholesOut").textContent = nBoreholes;
  document.getElementById("depthOut").textContent = boreholeDepth.toFixed(1);
  document.getElementById("spacingOut").textContent = spacing.toFixed(1);
  document.getElementById("footprintOut").textContent = footprintWidth.toFixed(1);
  document.getElementById("footprintOut2").textContent = footprintLength.toFixed(1);

  drawBHELayout(grid.rows, grid.cols, spacing, boreholeDepth, nBoreholes);
}

window.addEventListener("DOMContentLoaded", () => {
  runBHEDesign();
});