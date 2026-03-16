let pyChartInstance = null;

function getInputValue(id) {
  return parseFloat(document.getElementById(id).value);
}

function computePult(D, z, su, gammaEff, J) {
  const shallow = (3 + (gammaEff * z) / su + (J * z) / D) * su * D;
  const deep = 9 * su * D;
  return Math.min(shallow, deep);
}

function computeY50(eps50, D) {
  return 2.5 * eps50 * D;
}

function computeP(y, pult, y50) {
  if (y <= 0) return 0;

  const yRatio = y / y50;
  let p;

  if (y <= 8 * y50) {
    p = 0.5 * pult * Math.pow(yRatio, 1 / 3);
  } else {
    p = pult;
  }

  return Math.min(p, pult);
}

function integrateUltimateResistance(D, L, su, gammaEff, J) {
  const nSteps = 200;
  const dz = L / nSteps;
  let total = 0;

  for (let i = 0; i <= nSteps; i++) {
    const z = i * dz;
    const pult = computePult(D, z, su, gammaEff, J);

    if (i === 0 || i === nSteps) {
      total += 0.5 * pult;
    } else {
      total += pult;
    }
  }

  return total * dz; // kN
}

function buildPYCurve(D, z, su, gammaEff, eps50, J, ymax, npoints) {
  const pult = computePult(D, z, su, gammaEff, J);
  const y50 = computeY50(eps50, D);

  const curve = [];
  for (let i = 0; i <= npoints; i++) {
    const y = (ymax * i) / npoints;
    const p = computeP(y, pult, y50);
    curve.push({ x: y, y: p });
  }

  return { pult, y50, curve };
}

function validateInputs(D, L, su, gammaEff, eps50, J, z, ymax, npoints) {
  if ([D, L, su, gammaEff, eps50, J, z, ymax, npoints].some(v => isNaN(v))) {
    return "Please enter valid numeric inputs.";
  }
  if (D <= 0 || L <= 0 || su <= 0 || eps50 <= 0 || ymax <= 0 || npoints < 5) {
    return "Please ensure D, L, su, eps50, ymax are positive, and number of points is at least 5.";
  }
  if (z < 0 || z > L) {
    return "Depth z must be between 0 and the embedded length L.";
  }
  return null;
}

function updateOutputs(pult, y50, capacity) {
  document.getElementById("pultOut").textContent = pult.toFixed(2);
  document.getElementById("y50Out").textContent = y50.toFixed(4);
  document.getElementById("capacityOut").textContent = capacity.toFixed(2);
}

function plotPYCurve(curveData) {
  const ctx = document.getElementById("pyChart").getContext("2d");

  if (pyChartInstance) {
    pyChartInstance.destroy();
  }

  pyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "p–y curve",
          data: curveData,
          parsing: false,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Lateral displacement, y (m)"
          }
        },
        y: {
          title: {
            display: true,
            text: "Soil resistance, p (kN/m)"
          }
        }
      }
    }
  });
}

function runPYAnalysis() {
  const D = getInputValue("diameter");
  const L = getInputValue("length");
  const su = getInputValue("su");
  const gammaEff = getInputValue("gammaEff");
  const eps50 = getInputValue("eps50");
  const J = getInputValue("Jfactor");
  const z = getInputValue("depth");
  const ymax = getInputValue("ymax");
  const npoints = parseInt(document.getElementById("npoints").value, 10);

  const validationMessage = validateInputs(D, L, su, gammaEff, eps50, J, z, ymax, npoints);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  const result = buildPYCurve(D, z, su, gammaEff, eps50, J, ymax, npoints);
  const capacity = integrateUltimateResistance(D, L, su, gammaEff, J);

  updateOutputs(result.pult, result.y50, capacity);
  plotPYCurve(result.curve);
}

window.addEventListener("DOMContentLoaded", () => {
  runPYAnalysis();
});